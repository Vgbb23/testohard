type OrderStatusRecord = {
  orderId: string;
  status: string;
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __fruitfyOrderStatusStore__: Map<string, OrderStatusRecord> | undefined;
}

const store = globalThis.__fruitfyOrderStatusStore__ ?? new Map<string, OrderStatusRecord>();
globalThis.__fruitfyOrderStatusStore__ = store;

export const saveOrderStatus = (orderId: string, status: string) => {
  const normalizedOrderId = orderId.trim();
  const normalizedStatus = status.trim();
  if (!normalizedOrderId || !normalizedStatus) return;

  store.set(normalizedOrderId, {
    orderId: normalizedOrderId,
    status: normalizedStatus,
    updatedAt: new Date().toISOString(),
  });
};

export const getOrderStatus = (orderId: string) => {
  const normalizedOrderId = orderId.trim();
  if (!normalizedOrderId) return null;
  return store.get(normalizedOrderId) ?? null;
};
