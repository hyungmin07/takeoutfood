const CART_KEY = "takeoutfood_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(menu) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === menu.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: menu.id, name: menu.name, price: menu.price, qty: 1 });
  }
  saveCart(cart);
}

function updateQty(id, delta) {
  const cart = getCart();
  const item = cart.find((item) => item.id === id);
  if (!item) return;
  item.qty += delta;
  saveCart(item.qty > 0 ? cart : cart.filter((i) => i.id !== id));
}

function removeFromCart(id) {
  saveCart(getCart().filter((item) => item.id !== id));
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count;
  badge.hidden = count === 0;
}
