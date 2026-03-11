import {saveOrderStatus} from './status-store';

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

  try {
    const body = await parseBody(req);
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

    return sendJson(res, 200, {
      success: true,
      message: 'Webhook recebido com sucesso.',
    });
  } catch (error) {
    return sendJson(res, 400, {
      success: false,
      message: 'Payload de webhook inválido.',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
