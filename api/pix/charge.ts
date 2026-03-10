const FRUITFY_API_URL = process.env.FRUITFY_API_URL ?? 'https://api.fruitfy.io';

const sendJson = (
  res: {
    status: (statusCode: number) => { json: (payload: unknown) => void };
    setHeader: (name: string, value: string | string[]) => void;
  },
  statusCode: number,
  payload: unknown
) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.status(statusCode).json(payload);
};

const parseBody = async (req: any) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? JSON.parse(raw) : {};
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, {success: false, message: 'Method not allowed'});
  }

  const token = process.env.FRUITFY_TOKEN;
  const storeId = process.env.FRUITFY_STORE_ID;
  const productId = process.env.FRUITFY_PRODUCT_ID;

  if (!token || !storeId || !productId) {
    return sendJson(res, 500, {
      success: false,
      message: 'Variáveis da Fruitfy ausentes na Vercel.',
    });
  }

  try {
    const body = await parseBody(req);
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
      return sendJson(res, 422, {
        success: false,
        message: 'Dados obrigatórios ausentes para gerar cobrança PIX.',
      });
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

    const response = await fetch(`${FRUITFY_API_URL}/api/pix/charge`, {
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
    return sendJson(
      res,
      response.status,
      responseData ?? {success: false, message: 'Resposta inválida da Fruitfy.'}
    );
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      message: 'Falha ao criar cobrança PIX na Fruitfy.',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
