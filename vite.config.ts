import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const FRUITFY_API_URL = 'https://api.fruitfy.io';

const readJsonBody = async (req: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString('utf-8');
  return rawBody ? JSON.parse(rawBody) : {};
};

const sendJson = (res: NodeJS.WritableStream & { statusCode: number; setHeader: (name: string, value: string) => void }, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(payload));
};

type FruitfyConfig = {
  apiUrl: string;
  token: string;
  storeId: string;
  productId: string;
  appUrl: string;
  webhookUrl: string;
};

type LocalOrderStatusRecord = {
  orderId: string;
  status: string;
  updatedAt: string;
};

const normalizeWebhookUrl = (value: string) => value.replace(/\/+$/, '');

const resolveWebhookUrl = (req: any, fruitfyConfig: FruitfyConfig) => {
  if (fruitfyConfig.webhookUrl) {
    return normalizeWebhookUrl(fruitfyConfig.webhookUrl);
  }

  if (fruitfyConfig.appUrl) {
    return `${normalizeWebhookUrl(fruitfyConfig.appUrl)}/api/pix/webhook`;
  }

  const host = req.headers?.host;
  if (!host) return '';

  const forwardedProto = req.headers?.['x-forwarded-proto'];
  const proto = typeof forwardedProto === 'string' && forwardedProto.trim() ? forwardedProto : 'http';
  return `${proto}://${host}/api/pix/webhook`;
};

const createFruitfyPixProxy = (fruitfyConfig: FruitfyConfig) => ({
  name: 'fruitfy-pix-proxy',
  configureServer(server: { middlewares: { use: (path: string, fn: (req: any, res: any) => Promise<void>) => void } }) {
    const orderStatusStore = new Map<string, LocalOrderStatusRecord>();

    const saveOrderStatus = (orderId: string, status: string) => {
      const normalizedOrderId = orderId.trim();
      const normalizedStatus = status.trim();
      if (!normalizedOrderId || !normalizedStatus) return;

      orderStatusStore.set(normalizedOrderId, {
        orderId: normalizedOrderId,
        status: normalizedStatus,
        updatedAt: new Date().toISOString(),
      });
    };

    server.middlewares.use('/api/pix/charge', async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        sendJson(res, 405, {success: false, message: 'Method not allowed'});
        return;
      }

      const token = fruitfyConfig.token;
      const storeId = fruitfyConfig.storeId;
      const productId = fruitfyConfig.productId;

      if (!token || !storeId || !productId) {
        sendJson(res, 500, {
          success: false,
          message: 'Configuração Fruitfy ausente. Defina FRUITFY_TOKEN, FRUITFY_STORE_ID e FRUITFY_PRODUCT_ID no .env.local.',
        });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const {
          name,
          email,
          phone,
          cpf,
          itemValue,
          quantity,
          shippingValue,
          orderBumpsValue,
          totalValue,
          utm,
        } = body ?? {};

        if (!name || !email || !phone || !cpf || !itemValue) {
          sendJson(res, 422, {success: false, message: 'Dados obrigatórios ausentes para gerar cobrança PIX.'});
          return;
        }

        const parsedItemValue = Number(itemValue);
        const parsedQuantity = Math.max(1, Number(quantity) || 1);
        const parsedShippingValue = Math.max(0, Number(shippingValue) || 0);
        const parsedOrderBumpsValue = Math.max(0, Number(orderBumpsValue) || 0);
        const parsedTotalValue = Math.max(0, Number(totalValue) || 0);
        const fallbackTotalValue = Math.round(
          parsedItemValue * parsedQuantity + parsedShippingValue + parsedOrderBumpsValue
        );
        const ticketValue = parsedTotalValue > 0 ? Math.round(parsedTotalValue) : fallbackTotalValue;

        const webhookUrl = resolveWebhookUrl(req, fruitfyConfig);
        const response = await fetch(`${fruitfyConfig.apiUrl}/api/pix/charge`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Store-Id': storeId,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Language': 'pt_BR',
          },
          body: JSON.stringify({
            name,
            email,
            phone,
            cpf,
            items: [
              {
                id: productId,
                value: ticketValue,
                quantity: 1,
              },
            ],
            ...(webhookUrl ? {webhook_url: webhookUrl} : {}),
            ...(utm ? {utm} : {}),
          }),
        });

        const responseData = await response.json().catch(() => null);
        const createdOrderId = responseData?.data?.order_id ?? responseData?.data?.orderId ?? '';
        const createdStatus = responseData?.data?.status ?? 'waiting_payment';
        if (response.ok && responseData?.success && createdOrderId) {
          saveOrderStatus(String(createdOrderId), String(createdStatus));
        }
        sendJson(res, response.status, responseData ?? {success: false, message: 'Resposta inválida da Fruitfy.'});
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          message: 'Falha ao criar cobrança PIX na Fruitfy.',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    });

    server.middlewares.use('/api/pix/webhook', async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        sendJson(res, 405, {success: false, message: 'Method not allowed'});
        return;
      }

      try {
        const body = await readJsonBody(req);
        const event = body?.event ?? body?.type ?? 'unknown';
        const orderId = body?.data?.order_id ?? body?.order_id ?? body?.data?.id ?? '';
        const statusByEvent: Record<string, string> = {
          'order.waiting_payment': 'waiting_payment',
          'order.paid': 'paid',
          'order.cancelled': 'cancelled',
          'order.refunded': 'refunded',
        };
        const payloadStatus = body?.data?.status ?? body?.status ?? '';
        const resolvedStatus = statusByEvent[String(event)] ?? String(payloadStatus);
        if (orderId && resolvedStatus) {
          saveOrderStatus(String(orderId), String(resolvedStatus));
        }
        console.log('[Fruitfy webhook]', {event, orderId});

        sendJson(res, 200, {
          success: true,
          message: 'Webhook recebido com sucesso.',
        });
      } catch (error) {
        sendJson(res, 400, {
          success: false,
          message: 'Payload de webhook inválido.',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    });

    server.middlewares.use('/api/pix/order-status', async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.end();
        return;
      }

      if (req.method !== 'GET') {
        sendJson(res, 405, {success: false, message: 'Method not allowed'});
        return;
      }

      const requestUrl = new URL(req.url ?? '', 'http://localhost');
      const orderId = requestUrl.searchParams.get('orderId')?.trim() ?? '';

      if (!orderId) {
        sendJson(res, 422, {success: false, message: 'orderId é obrigatório.'});
        return;
      }

      const record = orderStatusStore.get(orderId);
      if (!record) {
        sendJson(res, 404, {success: false, message: 'Status do pedido ainda não disponível.'});
        return;
      }

      sendJson(res, 200, {success: true, data: record});
    });
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const fruitfyConfig: FruitfyConfig = {
    apiUrl: env.FRUITFY_API_URL ?? FRUITFY_API_URL,
    token: env.FRUITFY_TOKEN ?? '',
    storeId: env.FRUITFY_STORE_ID ?? '',
    productId: env.FRUITFY_PRODUCT_ID ?? '',
    appUrl: env.APP_URL ?? '',
    webhookUrl: env.FRUITFY_WEBHOOK_URL ?? '',
  };

  return {
    plugins: [react(), tailwindcss(), createFruitfyPixProxy(fruitfyConfig)],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify-file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
