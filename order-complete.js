const container = document.getElementById("orderComplete");
const orderId = new URLSearchParams(window.location.search).get("id");

async function loadOrder() {
  if (!orderId) {
    container.innerHTML = '<p class="empty-state">주문 정보를 찾을 수 없어요.</p>';
    return;
  }

  try {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) throw new Error("주문 정보를 찾을 수 없어요.");
    const order = await res.json();

    const itemsHtml = order.items
      .map(
        (item) => `
          <li>
            <span>${item.name} x ${item.qty}</span>
            <span>${(item.price * item.qty).toLocaleString()}원</span>
          </li>
        `
      )
      .join("");

    container.innerHTML = `
      <div class="complete-icon">🎉</div>
      <h2 class="complete-title">주문이 접수됐어요!</h2>

      <div class="order-number-badge">
        <span class="label">주문번호</span>
        <span class="number">#${String(order.orderNumber).padStart(4, "0")}</span>
      </div>

      <div class="receipt-card">
        <ul class="receipt-items">${itemsHtml}</ul>
        <div class="receipt-total-row">
          <span>총 금액</span>
          <span>${order.total.toLocaleString()}원</span>
        </div>
      </div>

      <p class="pickup-info">${order.customerName}님 · ${order.pickupTime ? order.pickupTime + " 픽업 예정" : "픽업 시간 미지정"}</p>
      <p class="payment-notice">💰 결제는 매장에서 픽업하실 때 해주세요.</p>
    `;
  } catch (err) {
    container.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

loadOrder();
