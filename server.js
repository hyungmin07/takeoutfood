require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { initializeApp: initializeAdminApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const MENUS = require("./menus.js");

const app = express();
const PORT = process.env.PORT || 3000;
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "firebase-service-account.json");
const MENU_BY_ID = new Map(MENUS.map((menu) => [menu.id, menu]));

let serviceAccount = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  serviceAccount = require(SERVICE_ACCOUNT_PATH);
}

let db = null;
if (serviceAccount) {
  const adminApp = initializeAdminApp({ credential: cert(serviceAccount) });
  db = getFirestore(adminApp);
}

// Firebase 서비스 계정이 아직 없는 로컬 개발 환경을 위한 임시 저장소
const memoryOrders = [];

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/menus", (req, res) => {
  res.json(MENUS);
});

app.post("/api/orders", async (req, res) => {
  const { items, customerName, phone, pickupTime } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "장바구니가 비어있어요." });
  }
  if (!customerName || !phone) {
    return res.status(400).json({ error: "이름과 연락처를 입력해주세요." });
  }

  const orderItems = [];
  let total = 0;
  for (const item of items) {
    const menu = MENU_BY_ID.get(item.id);
    if (!menu) {
      return res.status(400).json({ error: `존재하지 않는 메뉴예요: ${item.id}` });
    }
    const qty = Math.max(1, Number(item.qty) || 1);
    total += menu.price * qty;
    orderItems.push({ id: menu.id, name: menu.name, price: menu.price, qty });
  }

  const order = {
    id: crypto.randomUUID(),
    items: orderItems,
    total,
    customerName,
    phone,
    pickupTime: pickupTime || null,
    status: "접수됨",
    createdAt: new Date().toISOString(),
  };

  if (db) {
    await db.collection("orders").doc(order.id).set(order);
  } else {
    memoryOrders.push(order);
  }

  res.json(order);
});

app.get("/api/orders/:id", async (req, res) => {
  if (db) {
    const doc = await db.collection("orders").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "주문을 찾을 수 없어요." });
    return res.json(doc.data());
  }
  const order = memoryOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "주문을 찾을 수 없어요." });
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
