const cartList = document.getElementById("cartList");
const cartSummary = document.getElementById("cartSummary");
const cartTotalEl = document.getElementById("cartTotal");
const orderForm = document.getElementById("orderForm");
const orderError = document.getElementById("orderError");
const paymentOverlay = document.getElementById("paymentOverlay");

function renderCart() {
  const cart = getCart();

  if (cart.length === 0) {
    cartList.innerHTML = '<p class="empty-state">장바구니가 비어있어요.</p>';
    cartSummary.hidden = true;
    orderForm.hidden = true;
    return;
  }

  cartList.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item" data-id="${item.id}">
          <div class="info">
            <strong>${item.name}</strong><br />
            <span>${item.price.toLocaleString()}원</span>
          </div>
          <div class="qty-control">
            <button class="minus">-</button>
            <span>${item.qty}</span>
            <button class="plus">+</button>
          </div>
          <button class="remove">삭제</button>
        </div>
      `
    )
    .join("");

  cartList.querySelectorAll(".cart-item").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector(".plus").addEventListener("click", () => {
      updateQty(id, 1);
      renderCart();
      updateCartBadge();
    });
    row.querySelector(".minus").addEventListener("click", () => {
      updateQty(id, -1);
      renderCart();
      updateCartBadge();
    });
    row.querySelector(".remove").addEventListener("click", () => {
      removeFromCart(id);
      renderCart();
      updateCartBadge();
    });
  });

  cartSummary.hidden = false;
  cartTotalEl.textContent = `${cartTotal().toLocaleString()}원`;
  orderForm.hidden = false;
}

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  orderError.hidden = true;

  const formData = new FormData(orderForm);
  const cart = getCart();
  const paymentMethod = formData.get("paymentMethod");

  paymentOverlay.hidden = false;
  try {
    const payment = await mockPayment({ amount: cartTotal(), method: paymentMethod });
    if (!payment.success) throw new Error("결제에 실패했어요. 다시 시도해주세요.");

    const payload = {
      items: cart.map((item) => ({ id: item.id, qty: item.qty })),
      customerName: formData.get("customerName"),
      phone: formData.get("phone"),
      pickupTime: formData.get("pickupTime"),
      paymentMethod,
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "주문에 실패했어요.");

    clearCart();
    window.location.href = `order-complete.html?id=${data.id}`;
  } catch (err) {
    orderError.textContent = err.message;
    orderError.hidden = false;
  } finally {
    paymentOverlay.hidden = true;
  }
});

renderCart();
updateCartBadge();
