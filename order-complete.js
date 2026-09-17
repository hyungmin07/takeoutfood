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
      .map((item) => `<li>${item.name} x ${item.qty}</li>`)
      .join("");

    container.innerHTML = `
      <p>🎉 주문이 접수됐어요!</p>
      <div class="order-id">${order.id}</div>
      <ul style="text-align:left; display:inline-block;">${itemsHtml}</ul>
      <p><strong>총 금액: ${order.total.toLocaleString()}원</strong></p>
      <p>${order.customerName}님, ${order.pickupTime ? order.pickupTime + " 픽업 예정" : "픽업 시간 미지정"}</p>
    `;
  } catch (err) {
    container.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

loadOrder();
