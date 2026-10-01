require("dotenv").config({ quiet: true });

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { initializeApp: initializeAdminApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const MENUS = require("./menus.js");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "0000";
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "firebase-service-account.json");
const MENU_BY_ID = new Map(MENUS.map((menu) => [menu.id, menu]));
const ORDER_STATUSES = ["접수됨", "준비중", "완료"];
const PHONE_PATTERN = /^01[0-9]-[0-9]{3,4}-[0-9]{4}$/;

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
let memoryOrderCounter = 0;

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    "[주의] ADMIN_PASSWORD가 설정되지 않아 기본 비밀번호(0000)를 사용해요. .env에 ADMIN_PASSWORD를 꼭 설정하세요."
  );
}

app.use(express.json());
app.use(express.static(__dirname));

function requireAdmin(req, res, next) {
  if (req.get("x-admin-key") !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "관리자 인증이 필요해요." });
  }
  next();
}

async function nextOrderNumber() {
  if (db) {
    const counterRef = db.collection("counters").doc("orders");
    return db.runTransaction(async (tx) => {
      const doc = await tx.get(counterRef);
      const next = (doc.exists ? doc.data().value : 0) + 1;
      tx.set(counterRef, { value: next });
      return next;
    });
  }
  memoryOrderCounter += 1;
  return memoryOrderCounter;
}

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
  if (!PHONE_PATTERN.test(phone)) {
    return res.status(400).json({ error: "연락처는 010-0000-0000 형식으로 입력해주세요." });
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

  const orderNumber = await nextOrderNumber();

  const order = {
    id: crypto.randomUUID(),
    orderNumber,
    items: orderItems,
    total,
    customerName,
    phone,
    pickupTime: pickupTime || null,
    paymentMethod: "매장결제",
    paymentStatus: "결제예정",
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

app.post("/api/store/login", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.get("/api/store/orders", requireAdmin, async (req, res) => {
  if (db) {
    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
    return res.json(snapshot.docs.map((doc) => doc.data()));
  }
  res.json([...memoryOrders].reverse());
});

app.patch("/api/store/orders/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: "올바르지 않은 상태예요." });
  }

  if (db) {
    const ref = db.collection("orders").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "주문을 찾을 수 없어요." });
    await ref.update({ status });
    return res.json({ ...doc.data(), status });
  }

  const order = memoryOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "주문을 찾을 수 없어요." });
  order.status = status;
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
