// 모의결제 모듈. 실제 PG(토스페이먼츠 등) 연동 시 이 함수의 내부 구현만 교체하면 돼요.
// 반환 형태(Promise<{ success, transactionId }>)는 그대로 유지하면 호출부(cart.js) 수정이 필요 없어요.
function mockPayment({ amount, method }) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, transactionId: `MOCK-${Date.now()}` });
    }, 1200);
  });
}
