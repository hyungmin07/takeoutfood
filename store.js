const ADMIN_KEY_STORAGE = "takeoutfood_admin_key";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const orderBoard = document.getElementById("orderBoard");
const orderList = document.getElementById("orderList");
const boardStatus = document.getElementById("boardStatus");
const printReceipt = document.getElementById("printReceipt");
const refreshBtn = document.getElementById("refreshBtn");

const STATUS_FLOW = { 접수됨: "준비중", 준비중: "완료" };
const STATUS_LABEL = { 접수됨: "준비 시작", 준비중: "완료 처리" };

let adminKey = sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
let pollTimer = null;

async function tryLogin(key) {
  const res = await fetch("/api/store/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": key },
    body: "{}",
  });
  return res.ok;
}

async function fetchOrders() {
  const res = await fetch("/api/store/orders", { headers: { "x-admin-key": adminKey } });
  if (res.status === 401) {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    adminKey = "";
    showLogin();
    return [];
  }
  return res.json();
}

async function updateStatus(id, status) {
  await fetch(`/api/store/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify({ status }),
  });
  refresh();
}

function printBill(order) {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td>${item.name}</td><td>${item.qty}</td><td>${(item.price * item.qty).toLocaleString()}</td></tr>`
    )
    .join("");

  printReceipt.innerHTML = `
    <h2>리향</h2>
    <p>포장 주문 영수증</p>
    <hr />
    <p>주문번호 #${String(order.orderNumber).padStart(4, "0")}</p>
    <p>${new Date(order.createdAt).toLocaleString("ko-KR")}</p>
    <hr />
    <table>
      <thead><tr><th>메뉴</th><th>수량</th><th>금액</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <hr />
    <p class="receipt-total">합계 ${order.total.toLocaleString()}원</p>
    <p>결제수단: ${order.paymentMethod} (${order.paymentStatus})</p>
    <hr />
    <p>${order.customerName} / ${order.phone}</p>
    <p>${order.pickupTime ? "픽업 희망 " + order.pickupTime : "픽업 시간 미지정"}</p>
  `;

  window.print();
}

function renderOrders(orders) {
  if (orders.length === 0) {
    orderList.innerHTML = '<p class="empty-state">아직 들어온 주문이 없어요.</p>';
    return;
  }

  orderList.innerHTML = orders
    .map((order) => {
      const itemsHtml = order.items.map((item) => `<li>${item.name} x ${item.qty}</li>`).join("");
      const nextStatus = STATUS_FLOW[order.status];
      return `
        <div class="order-card status-${order.status}" data-id="${order.id}">
          <div class="order-card-head">
            <strong>#${String(order.orderNumber).padStart(4, "0")}</strong>
            <span class="status-badge">${order.status}</span>
          </div>
          <ul>${itemsHtml}</ul>
          <p>${order.customerName} · ${order.phone}</p>
          <p>${order.pickupTime ? "픽업 " + order.pickupTime : "픽업 시간 미지정"} · ${order.paymentMethod}</p>
          <p><strong>${order.total.toLocaleString()}원</strong></p>
          <div class="order-card-actions">
            ${nextStatus ? `<button class="advance-status">${STATUS_LABEL[order.status]}</button>` : ""}
            <button class="print-bill">빌지 인쇄</button>
          </div>
        </div>
      `;
    })
    .join("");

  orderList.querySelectorAll(".order-card").forEach((card) => {
    const id = card.dataset.id;
    const order = orders.find((o) => o.id === id);

    const advanceBtn = card.querySelector(".advance-status");
    if (advanceBtn) {
      advanceBtn.addEventListener("click", () => updateStatus(id, STATUS_FLOW[order.status]));
    }
    card.querySelector(".print-bill").addEventListener("click", () => printBill(order));
  });
}

async function refresh() {
  const orders = await fetchOrders();
  boardStatus.textContent = `총 ${orders.length}건 · 마지막 갱신 ${new Date().toLocaleTimeString("ko-KR")}`;
  renderOrders(orders);
}

function showBoard() {
  loginForm.hidden = true;
  orderBoard.hidden = false;
  refresh();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refresh, 5000);
}

function showLogin() {
  loginForm.hidden = false;
  orderBoard.hidden = true;
  if (pollTimer) clearInterval(pollTimer);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const key = adminPasswordInput.value;
  const ok = await tryLogin(key);
  if (!ok) {
    loginError.textContent = "비밀번호가 올바르지 않아요.";
    loginError.hidden = false;
    return;
  }
  adminKey = key;
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
  showBoard();
});

refreshBtn.addEventListener("click", refresh);

if (adminKey) {
  tryLogin(adminKey).then((ok) => (ok ? showBoard() : showLogin()));
} else {
  showLogin();
}
