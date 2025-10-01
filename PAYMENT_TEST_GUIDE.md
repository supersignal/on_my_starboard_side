# 나이스페이먼츠 결제/취소 테스트 MCP 가이드

## 개요

이 프로젝트에 추가된 결제/취소 테스트 기능을 통해 나이스페이먼츠 API의 동작을 시뮬레이션할 수 있습니다. **실제 결제는 발생하지 않으며**, 테스트 목적으로만 사용됩니다.

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# MCP 서버 (stdio)
npm start

# HTTP 서버
npm run start-http

# 하이브리드 서버 (MCP + HTTP)
npm run start-hybrid
```

### 2. MCP 도구 사용

MCP 클라이언트에서 다음 도구들을 사용할 수 있습니다:

- `test_payment` - 결제 테스트
- `test_cancel` - 결제 취소 테스트  
- `test_payment_status` - 결제 상태 조회
- `test_clear_data` - 테스트 데이터 초기화
- `test_list_payments` - 테스트 데이터 조회

## 📋 API 명세

### 1. 결제 테스트 (`test_payment`)

**파라미터:**
```json
{
  "orderId": "ORDER_20241201_001",
  "amount": 10000,
  "goodsName": "테스트 상품",
  "buyerName": "홍길동",
  "buyerEmail": "test@example.com",
  "buyerTel": "010-1234-5678",
  "returnUrl": "https://example.com/return",
  "notifyUrl": "https://example.com/notify",
  "testMode": true
}
```

**응답 예시:**
```json
{
  "success": true,
  "orderId": "ORDER_20241201_001",
  "transactionId": "TXN_1701234567890_abc123",
  "amount": 10000,
  "status": "SUCCESS",
  "message": "테스트 결제가 성공적으로 처리되었습니다.",
  "paymentUrl": "https://test-payment.nicepay.co.kr/payment/TXN_1701234567890_abc123",
  "timestamp": "2024-12-01T10:30:00.000Z"
}
```

### 2. 결제 취소 테스트 (`test_cancel`)

**파라미터:**
```json
{
  "orderId": "ORDER_20241201_001",
  "amount": 10000,
  "reason": "고객 요청",
  "testMode": true
}
```

**응답 예시:**
```json
{
  "success": true,
  "orderId": "ORDER_20241201_001",
  "transactionId": "TXN_1701234567890_abc123",
  "amount": 10000,
  "status": "CANCELLED",
  "message": "테스트 취소가 성공적으로 처리되었습니다.",
  "timestamp": "2024-12-01T10:35:00.000Z"
}
```

### 3. 결제 상태 조회 (`test_payment_status`)

**파라미터:**
```json
{
  "orderId": "ORDER_20241201_001",
  "testMode": true
}
```

**응답 예시:**
```json
{
  "success": true,
  "orderId": "ORDER_20241201_001",
  "transactionId": "TXN_1701234567890_abc123",
  "amount": 10000,
  "status": "SUCCESS",
  "paymentMethod": "TEST_CARD",
  "paidAt": "2024-12-01T10:30:00.000Z",
  "message": "결제 상태 조회가 완료되었습니다.",
  "timestamp": "2024-12-01T10:40:00.000Z"
}
```

### 4. 테스트 데이터 관리

**데이터 초기화 (`test_clear_data`):**
```json
{}
```

**데이터 조회 (`test_list_payments`):**
```json
{}
```

## 🌐 HTTP API 사용

HTTP 서버를 실행한 경우, 다음 엔드포인트를 사용할 수 있습니다:

```bash
# 결제 테스트
curl -X POST http://localhost:3000/mcp/test_payment \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "orderId": "ORDER_20241201_001",
    "amount": 10000,
    "goodsName": "테스트 상품",
    "buyerName": "홍길동",
    "buyerEmail": "test@example.com",
    "buyerTel": "010-1234-5678",
    "returnUrl": "https://example.com/return",
    "notifyUrl": "https://example.com/notify",
    "testMode": true
  }'

# 결제 취소
curl -X POST http://localhost:3000/mcp/test_cancel \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "orderId": "ORDER_20241201_001",
    "amount": 10000,
    "reason": "고객 요청",
    "testMode": true
  }'

# 결제 상태 조회
curl -X POST http://localhost:3000/mcp/test_payment_status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "orderId": "ORDER_20241201_001",
    "testMode": true
  }'

# 테스트 데이터 조회
curl -X GET http://localhost:3000/mcp/test_list_payments \
  -H "X-API-Key: your-api-key"

# 테스트 데이터 초기화
curl -X POST http://localhost:3000/mcp/test_clear_data \
  -H "X-API-Key: your-api-key"
```

## 🔧 테스트 시나리오

### 기본 결제 플로우 테스트

1. **결제 요청**
   ```json
   {
     "orderId": "TEST_001",
     "amount": 5000,
     "goodsName": "테스트 상품 1",
     "buyerName": "김철수",
     "buyerEmail": "kim@example.com",
     "buyerTel": "010-1111-2222",
     "returnUrl": "https://example.com/success",
     "notifyUrl": "https://example.com/notify",
     "testMode": true
   }
   ```

2. **결제 상태 확인**
   ```json
   {
     "orderId": "TEST_001",
     "testMode": true
   }
   ```

3. **부분 취소**
   ```json
   {
     "orderId": "TEST_001",
     "amount": 2000,
     "reason": "부분 취소 테스트",
     "testMode": true
   }
   ```

4. **전체 취소**
   ```json
   {
     "orderId": "TEST_001",
     "amount": 3000,
     "reason": "전체 취소 테스트",
     "testMode": true
   }
   ```

### 에러 시나리오 테스트

1. **중복 주문번호**
   - 동일한 `orderId`로 두 번 결제 요청

2. **존재하지 않는 주문 취소**
   - 존재하지 않는 `orderId`로 취소 요청

3. **취소 금액 초과**
   - 결제 금액보다 큰 금액으로 취소 요청

4. **이미 취소된 주문 재취소**
   - 이미 취소된 주문에 대해 다시 취소 요청

## 📊 테스트 데이터 현황 조회

`test_list_payments` 도구를 사용하면 현재 저장된 모든 테스트 데이터를 조회할 수 있습니다:

```json
{
  "payments": [...],
  "cancels": [...],
  "summary": {
    "totalPayments": 5,
    "totalCancels": 2,
    "successPayments": 4,
    "cancelledPayments": 1
  }
}
```

## ⚠️ 주의사항

1. **테스트 모드 전용**: `testMode`는 항상 `true`로 설정해야 합니다.
2. **메모리 저장**: 테스트 데이터는 서버 메모리에 저장되며, 서버 재시작 시 초기화됩니다.
3. **실제 결제 없음**: 이 기능은 실제 결제를 처리하지 않습니다.
4. **API 키 필요**: HTTP API 사용 시 유효한 API 키가 필요합니다.

## 🛠️ 개발자 정보

- **개발자**: IT기술지원 (it@nicepay.co.kr)
- **버전**: 1.0.0
- **라이선스**: MIT
- **저장소**: @supersignal/on_my_starboard_side

## 📞 지원

기술 문의나 버그 리포트는 다음으로 연락해주세요:
- 이메일: it@nicepay.co.kr
- GitHub Issues: 프로젝트 저장소의 Issues 탭
