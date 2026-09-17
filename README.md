# takeoutfood

테이크아웃 음식 주문 웹앱

## 기능

- 메뉴 목록 조회 (카테고리 필터)
- 장바구니 담기/수량 조절/삭제 (localStorage)
- 주문 접수 (이름, 연락처, 픽업 희망 시간)
- 주문 완료 페이지

## 실행 방법

```bash
npm install
npm start
```

`http://localhost:3000` 에서 확인할 수 있어요.

## Firebase 연동 (선택)

기본적으로는 서버 메모리에 주문을 임시 저장해요. Firestore에 영구 저장하려면:

1. Firebase 콘솔에서 서비스 계정 키(JSON)를 발급받아요.
2. `.env` 파일을 만들고 `FIREBASE_SERVICE_ACCOUNT_JSON`에 해당 JSON을 한 줄로 넣거나,
   프로젝트 루트에 `firebase-service-account.json` 파일로 저장해요.

`.env.example`을 참고하세요.

## 다음에 추가하면 좋을 것들

- 관리자용 주문 현황 페이지
- 로그인 (rmfood처럼 Firebase Auth)
- 결제 연동
- 매장/픽업 위치 다중 지원
