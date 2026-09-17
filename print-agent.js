// 매장 PC에서 계속 켜두는 "인쇄 도우미" 프로그램.
// 클라우드에 올라간 주문 서버를 주기적으로 확인하다가, 새로 결제된 주문이 오면
// 매장 랜(LAN)에 연결된 영수증 프린터로 바로 인쇄해요. (npm run print-agent)
require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const { printer: ThermalPrinter, types: PrinterTypes, characterSet: CharacterSet } = require(
  "node-thermal-printer"
);

const SERVER_URL = process.env.STORE_SERVER_URL || "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "0000";
const PRINTER_IP = process.env.PRINTER_IP;
const PRINTER_PORT = process.env.PRINTER_PORT || 9100;
const POLL_INTERVAL_MS = Number(process.env.PRINT_AGENT_POLL_MS) || 5000;
const PRINTED_LOG_PATH = path.join(__dirname, ".printed-orders.json");

if (!PRINTER_IP) {
  console.error("[오류] .env에 PRINTER_IP(프린터 IP 주소)를 설정해주세요. 예: PRINTER_IP=192.168.0.50");
  process.exit(1);
}

function loadPrintedIds() {
  try {
    return new Set(JSON.parse(fs.readFileSync(PRINTED_LOG_PATH, "utf-8")));
  } catch {
    return new Set();
  }
}

function savePrintedIds(printedIds) {
  fs.writeFileSync(PRINTED_LOG_PATH, JSON.stringify([...printedIds]));
}

const printedIds = loadPrintedIds();

async function fetchOrders() {
  const res = await fetch(`${SERVER_URL}/api/store/orders`, {
    headers: { "x-admin-key": ADMIN_PASSWORD },
  });
  if (!res.ok) throw new Error(`주문 목록을 불러오지 못했어요 (HTTP ${res.status})`);
  return res.json();
}

async function printOrder(order) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${PRINTER_IP}:${PRINTER_PORT}`,
    characterSet: CharacterSet.KOREA,
    options: { timeout: 5000 },
  });

  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println("리향");
  printer.bold(false);
  printer.println("포장 주문 영수증");
  printer.drawLine();

  printer.alignLeft();
  printer.println(`주문번호 #${String(order.orderNumber).padStart(4, "0")}`);
  printer.println(new Date(order.createdAt).toLocaleString("ko-KR"));
  printer.drawLine();

  order.items.forEach((item) => {
    printer.tableCustom([
      { text: item.name, align: "LEFT", width: 0.55 },
      { text: `x${item.qty}`, align: "CENTER", width: 0.15 },
      { text: (item.price * item.qty).toLocaleString(), align: "RIGHT", width: 0.3 },
    ]);
  });
  printer.drawLine();

  printer.bold(true);
  printer.println(`합계 ${order.total.toLocaleString()}원`);
  printer.bold(false);
  printer.println(`결제수단: ${order.paymentMethod} (${order.paymentStatus})`);
  printer.drawLine();

  printer.println(`${order.customerName} / ${order.phone}`);
  printer.println(order.pickupTime ? `픽업 희망 ${order.pickupTime}` : "픽업 시간 미지정");
  printer.cut();

  await printer.execute();
}

async function poll() {
  try {
    const orders = await fetchOrders();
    const newOrders = orders.filter((order) => !printedIds.has(order.id));

    for (const order of newOrders) {
      try {
        await printOrder(order);
        console.log(`[인쇄 완료] 주문 #${order.orderNumber}`);
      } catch (err) {
        console.error(`[인쇄 실패] 주문 #${order.orderNumber}: ${err.message}`);
        continue; // 인쇄 실패한 주문은 printedIds에 추가하지 않아 다음 주기에 재시도함
      }
      printedIds.add(order.id);
    }

    if (newOrders.length > 0) savePrintedIds(printedIds);
  } catch (err) {
    console.error(`[오류] ${err.message}`);
  }
}

console.log(`인쇄 도우미 시작: ${SERVER_URL} 를 ${POLL_INTERVAL_MS / 1000}초마다 확인해요.`);
console.log(`프린터: tcp://${PRINTER_IP}:${PRINTER_PORT}`);
poll();
setInterval(poll, POLL_INTERVAL_MS);
