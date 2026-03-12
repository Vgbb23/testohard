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
};

const createFruitfyPixProxy = (fruitfyConfig: FruitfyConfig) => ({
  name: 'fruitfy-pix-proxy',
  configureServer(server: { middlewares: { use: (path: string, fn: (req: any, res: any) => Promise<void>) => void } }) {
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
            ...(utm ? {utm} : {}),
          }),
        });

        const responseData = await response.json().catch(() => null);
        sendJson(res, response.status, responseData ?? {success: false, message: 'Resposta inválida da Fruitfy.'});
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          message: 'Falha ao criar cobrança PIX na Fruitfy.',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    });

    server.middlewares.use('/api/order', async (req, res) => {
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

      const token = fruitfyConfig.token;
      const storeId = fruitfyConfig.storeId;

      if (!token || !storeId) {
        sendJson(res, 500, {
          success: false,
          message: 'Configuração Fruitfy ausente. Defina FRUITFY_TOKEN e FRUITFY_STORE_ID no .env.local.',
        });
        return;
      }

      try {
        const requestUrl = new URL(req.url ?? '', 'http://localhost');
        const pathParts = requestUrl.pathname.split('/').filter(Boolean);
        const rawOrderId = pathParts[pathParts.length - 1] ?? '';
        const orderId = decodeURIComponent(rawOrderId);

        if (!orderId || orderId === 'order') {
          sendJson(res, 400, {success: false, message: 'ID do pedido inválido.'});
          return;
        }

        const response = await fetch(`${fruitfyConfig.apiUrl}/api/order/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Store-Id': storeId,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Language': 'pt_BR',
          },
        });

        const responseData = await response.json().catch(() => null);
        sendJson(res, response.status, responseData ?? {success: false, message: 'Resposta inválida da Fruitfy.'});
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          message: 'Falha ao consultar status do pedido na Fruitfy.',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
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
