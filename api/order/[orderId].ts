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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.status(statusCode).json(payload);
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, {success: false, message: 'Method not allowed'});
  }

  const token = process.env.FRUITFY_TOKEN;
  const storeId = process.env.FRUITFY_STORE_ID;

  if (!token || !storeId) {
    return sendJson(res, 500, {
      success: false,
      message: 'Variáveis da Fruitfy ausentes na Vercel.',
    });
  }

  const rawOrderId = req.query?.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  if (!orderId || typeof orderId !== 'string') {
    return sendJson(res, 400, {
      success: false,
      message: 'ID do pedido inválido.',
    });
  }

  try {
    const response = await fetch(`${FRUITFY_API_URL}/api/order/${encodeURIComponent(orderId)}`, {
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
    return sendJson(
      res,
      response.status,
      responseData ?? {success: false, message: 'Resposta inválida da Fruitfy.'}
    );
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      message: 'Falha ao consultar status do pedido na Fruitfy.',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
