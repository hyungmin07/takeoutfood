const menuGrid = document.getElementById("menuGrid");
const categoryTabs = document.getElementById("categoryTabs");

let allMenus = [];
let activeCategory = "전체";

function renderTabs() {
  const categories = ["전체", ...new Set(allMenus.map((menu) => menu.category))];
  categoryTabs.innerHTML = categories
    .map(
      (category) =>
        `<button data-category="${category}" class="${category === activeCategory ? "active" : ""}">${category}</button>`
    )
    .join("");

  categoryTabs.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      renderTabs();
      renderMenus();
    });
  });
}

function renderMenus() {
  const menus =
    activeCategory === "전체" ? allMenus : allMenus.filter((menu) => menu.category === activeCategory);

  menuGrid.innerHTML = menus
    .map(
      (menu) => `
        <div class="menu-card">
          <h3>${menu.name}</h3>
          <p>${menu.description}</p>
          <span class="price">${menu.price.toLocaleString()}원</span>
          <button data-id="${menu.id}">담기</button>
        </div>
      `
    )
    .join("");

  menuGrid.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const menu = allMenus.find((m) => m.id === btn.dataset.id);
      addToCart(menu);
      updateCartBadge();
      btn.textContent = "담았어요 ✓";
      setTimeout(() => (btn.textContent = "담기"), 800);
    });
  });
}

async function init() {
  const res = await fetch("/api/menus");
  allMenus = await res.json();
  renderTabs();
  renderMenus();
  updateCartBadge();
}

init();
