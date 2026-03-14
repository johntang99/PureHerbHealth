type CartItem = { id: string; productId: string; quantity: number };

const cartStore = new Map<string, CartItem[]>();

export function getCart(key: string) {
  return cartStore.get(key) ?? [];
}

export function upsertCartItem(key: string, productId: string, quantity: number) {
  const current = getCart(key);
  const existing = current.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity = quantity;
  } else {
    current.push({ id: `${Date.now()}-${productId}`, productId, quantity });
  }
  cartStore.set(key, current);
  return current;
}

export function removeCartItem(key: string, itemId: string) {
  const next = getCart(key).filter((item) => item.id !== itemId);
  cartStore.set(key, next);
  return next;
}
