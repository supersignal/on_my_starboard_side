# 나이스페이먼츠 실제 결제 연동 가이드

## ⚠️ 중요 경고

**실제 결제 기능은 실제 돈이 이동하는 기능입니다!** 
- 테스트 환경에서 충분히 검증한 후 사용하세요
- 프로덕션 환경에서는 반드시 보안 검토를 거쳐야 합니다
- 모든 결제 내역은 법적 책임이 따릅니다

## 🚀 실제 결제 설정 방법

### 1. 나이스페이먼츠 계약 체결

실제 결제를 사용하려면 먼저 나이스페이먼츠와 정식 계약을 체결해야 합니다:

1. **나이스페이먼츠 영업팀 연락**
   - 이메일: sales@nicepay.co.kr
   - 전화: 1588-1234
   - 웹사이트: https://www.nicepay.co.kr

2. **필요 서류 준비**
   - 사업자등록증
   - 통신판매업 신고증
   - 개인정보처리방침
   - 서비스 이용약관

3. **계약 체결 후 받는 정보**
   - 상점 ID (Merchant ID)
   - 상점 키 (Merchant Key)
   - API 엔드포인트 URL
   - 테스트/운영 환경 구분

### 2. 환경변수 설정

`.env` 파일을 생성하고 다음 정보를 입력하세요:

```bash
# 나이스페이먼츠 실제 결제 설정
NICEPAY_MERCHANT_ID=your_actual_merchant_id
NICEPAY_MERCHANT_KEY=your_actual_merchant_key
NICEPAY_BASE_URL=https://api.nicepay.co.kr
NICEPAY_TEST_MODE=false

# 보안 설정 (프로덕션 환경에서 필수)
API_KEYS=your_secure_api_key_here
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
```

### 3. 서버 실행

```bash
# 환경변수 로드 후 서버 실행
npm start

# 또는 HTTP 서버
npm run start-http

# 또는 하이브리드 서버
npm run start-hybrid
```

## 📋 실제 결제 API 사용법

### 1. 실제 결제 요청 (`real_payment`)

**MCP 도구 사용:**
```json
{
  "tool": "real_payment",
  "parameters": {
    "orderId": "REAL_ORDER_20241201_001",
    "amount": 10000,
    "goodsName": "실제 상품",
    "buyerName": "홍길동",
    "buyerEmail": "real@example.com",
    "buyerTel": "010-1234-5678",
    "returnUrl": "https://yoursite.com/payment/success",
    "notifyUrl": "https://yoursite.com/payment/notify",
    "paymentMethod": "CARD",
    "useEscrow": false,
    "testMode": false
  }
}
```

**HTTP API 사용:**
```bash
curl -X POST http://localhost:3000/mcp/real_payment \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "orderId": "REAL_ORDER_20241201_001",
    "amount": 10000,
    "goodsName": "실제 상품",
    "buyerName": "홍길동",
    "buyerEmail": "real@example.com",
    "buyerTel": "010-1234-5678",
    "returnUrl": "https://yoursite.com/payment/success",
    "notifyUrl": "https://yoursite.com/payment/notify",
    "paymentMethod": "CARD",
    "useEscrow": false,
    "testMode": false
  }'
```

### 2. 실제 결제 취소 (`real_cancel`)

**MCP 도구 사용:**
```json
{
  "tool": "real_cancel",
  "parameters": {
    "orderId": "REAL_ORDER_20241201_001",
    "amount": 10000,
    "reason": "고객 요청",
    "testMode": false
  }
}
```

### 3. 실제 결제 상태 조회 (`real_payment_status`)

**MCP 도구 사용:**
```json
{
  "tool": "real_payment_status",
  "parameters": {
    "orderId": "REAL_ORDER_20241201_001",
    "testMode": false
  }
}
```

### 4. 결제 서비스 설정 조회 (`real_payment_config`)

**MCP 도구 사용:**
```json
{
  "tool": "real_payment_config",
  "parameters": {}
}
```

## 🔒 보안 고려사항

### 1. 환경변수 보안

```bash
# .env 파일은 절대 Git에 커밋하지 마세요
echo ".env" >> .gitignore

# 프로덕션 환경에서는 환경변수 관리 서비스 사용
# 예: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault
```

### 2. API 키 관리

```bash
# 강력한 API 키 생성
openssl rand -hex 32

# API 키 로테이션 정책 수립
# 예: 90일마다 키 변경
```

### 3. 네트워크 보안

```bash
# HTTPS 필수 사용
# SSL 인증서 설치 및 갱신
# 방화벽 설정으로 필요한 포트만 개방
```

### 4. 로그 보안

```bash
# 결제 관련 로그는 별도 저장
# 개인정보 마스킹 처리
# 로그 접근 권한 제한
```

## 🧪 테스트 전략

### 1. 단계별 테스트

1. **개발 환경 테스트**
   - `NICEPAY_TEST_MODE=true`로 설정
   - 테스트 카드 번호 사용
   - 소액 결제 테스트

2. **스테이징 환경 테스트**
   - 실제 API 연동 테스트
   - 다양한 결제 수단 테스트
   - 에러 시나리오 테스트

3. **프로덕션 환경 배포**
   - 점진적 롤아웃
   - 모니터링 강화
   - 롤백 계획 수립

### 2. 테스트 케이스

```json
// 성공 케이스
{
  "orderId": "TEST_SUCCESS_001",
  "amount": 1000,
  "testMode": false
}

// 실패 케이스
{
  "orderId": "TEST_FAIL_001",
  "amount": 0,
  "testMode": false
}

// 취소 케이스
{
  "orderId": "TEST_CANCEL_001",
  "amount": 1000,
  "reason": "테스트 취소",
  "testMode": false
}
```

## 📊 모니터링 및 알림

### 1. 결제 성공률 모니터링

```javascript
// 결제 성공률 추적
const successRate = (successfulPayments / totalPayments) * 100;

// 임계값 설정 (예: 95% 미만 시 알림)
if (successRate < 95) {
  sendAlert('결제 성공률이 임계값 이하입니다.');
}
```

### 2. 에러 알림 설정

```javascript
// 결제 실패 시 즉시 알림
if (paymentResponse.success === false) {
  sendAlert(`결제 실패: ${paymentResponse.errorCode}`);
}
```

### 3. 대시보드 구성

- 실시간 결제 현황
- 일/월별 결제 통계
- 에러 발생 현황
- 시스템 상태 모니터링

## 🚨 문제 해결

### 1. 일반적인 오류

**인증 오류:**
```
Error: 나이스페이먼츠 설정이 올바르지 않습니다.
```
→ 환경변수 `NICEPAY_MERCHANT_ID`와 `NICEPAY_MERCHANT_KEY` 확인

**네트워크 오류:**
```
Error: API 호출 실패: fetch failed
```
→ 네트워크 연결 및 방화벽 설정 확인

**서명 오류:**
```
Error: Invalid signature
```
→ 상점 키 확인 및 서명 생성 로직 검토

### 2. 로그 확인

```bash
# 서버 로그 확인
tail -f logs/payment.log

# 에러 로그 필터링
grep "ERROR" logs/payment.log

# 특정 주문번호로 검색
grep "ORDER_20241201_001" logs/payment.log
```

### 3. 나이스페이먼츠 지원팀 연락

- **기술 지원**: it@nicepay.co.kr
- **영업 문의**: sales@nicepay.co.kr
- **긴급 상황**: 1588-1234

## 📚 추가 자료

- [나이스페이먼츠 개발자 센터](https://developers.nicepay.co.kr)
- [API 문서](https://developers.nicepay.co.kr/docs)
- [샘플 코드](https://github.com/nicepayments/samples)
- [FAQ](https://developers.nicepay.co.kr/faq)

## ⚖️ 법적 고지

1. **결제 서비스 제공자 책임**: 나이스페이먼츠
2. **가맹점 책임**: 결제 시스템 운영 및 고객 관리
3. **개인정보 보호**: 개인정보보호법 준수
4. **전자상거래법**: 전자상거래 등에서의 소비자보호에 관한 법률 준수

---

**⚠️ 주의사항**: 이 가이드는 참고용이며, 실제 구현 시에는 나이스페이먼츠의 최신 API 문서와 법적 요구사항을 반드시 확인하세요.
