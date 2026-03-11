import {getOrderStatus} from './status-store';

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

  const orderId = String(req.query?.orderId ?? '').trim();
  if (!orderId) {
    return sendJson(res, 422, {
      success: false,
      message: 'orderId é obrigatório.',
    });
  }

  const record = getOrderStatus(orderId);
  if (!record) {
    return sendJson(res, 404, {
      success: false,
      message: 'Status do pedido ainda não disponível.',
    });
  }

  return sendJson(res, 200, {
    success: true,
    data: record,
  });
}
