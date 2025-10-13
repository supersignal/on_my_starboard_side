# 하이브리드 서버 아키텍처 설명

## 🏗️ 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    server.hybrid.ts                        │
│                     (하이브리드 서버)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐              ┌─────────────────────┐   │
│  │   MCP 서버      │              │    HTTP 서버        │   │
│  │  (stdio 통신)   │              │   (REST API)        │   │
│  └─────────────────┘              └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           │                                    │
    ┌─────────────┐                    ┌─────────────┐
    │ MCP 클라이언트 │                    │ HTTP 클라이언트 │
    │             │                    │             │
    │ • Cursor    │                    │ • 웹 브라우저  │
    │ • Claude    │                    │ • Postman   │
    │ • 기타 MCP  │                    │ • curl      │
    │   클라이언트  │                    │ • 다른 서비스  │
    └─────────────┘                    └─────────────┘
```

## 🔄 동작 방식

### 1. MCP 서버 (stdio 통신)
```typescript
// MCP 서버 초기화
const mcpServer = new McpServer({
  name: "nicepayments-integration-guide",
  description: "MCP-compatible toolset for integrating with nicepayments systems.",
  version: "1.0.0",
});

// MCP 도구 등록
mcpServer.tool("get_documents", ...);
mcpServer.tool("test_payment", ...);
mcpServer.tool("real_payment", ...);

// stdio 연결
const stdio = new StdioServerTransport();
await mcpServer.connect(stdio);
```

**특징:**
- MCP 프로토콜을 통한 표준화된 통신
- Cursor, Claude Desktop 등에서 직접 사용
- JSON-RPC 기반 메시지 교환
- 실시간 양방향 통신

### 2. HTTP 서버 (REST API)
```typescript
// Express 서버 초기화
const app = express();
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// HTTP 엔드포인트 등록
app.post('/mcp/get_documents', ...);
app.post('/mcp/test_payment', ...);
app.post('/mcp/real_payment', ...);

// 서버 시작
app.listen(PORT, '0.0.0.0', ...);
```

**특징:**
- 표준 HTTP/HTTPS 프로토콜
- RESTful API 설계
- CORS 지원으로 브라우저에서 접근 가능
- 다양한 HTTP 클라이언트에서 사용 가능

## 🎯 하이브리드 서버의 장점

### 1. **유연한 접근 방식**
```bash
# MCP 클라이언트에서 사용
Cursor → MCP 서버 → 나이스정보통신 API

# HTTP 클라이언트에서 사용  
웹 브라우저 → HTTP 서버 → 나이스정보통신 API
```

### 2. **개발 편의성**
- **개발 중**: HTTP API로 Postman, curl 등으로 테스트
- **프로덕션**: MCP 클라이언트에서 직접 사용
- **디버깅**: 두 가지 방식으로 동일한 기능 테스트 가능

### 3. **확장성**
- MCP 도구 추가 시 HTTP 엔드포인트도 자동으로 추가
- 하나의 코드베이스에서 두 가지 인터페이스 제공
- 미들웨어 공유 (인증, Rate Limiting, 에러 처리)

## 🔧 공통 미들웨어

하이브리드 서버는 두 서버가 공통 미들웨어를 사용합니다:

```typescript
// 보안 미들웨어
app.use('/mcp', apiKeyAuth);           // MCP 엔드포인트는 API 키 필수
app.use('/health', optionalApiKeyAuth); // 헬스체크는 선택적 인증

// Rate Limiting
app.use('/mcp/get_documents', searchRateLimit);
app.use('/mcp/test_payment', generalRateLimit);
app.use('/mcp/real_payment', generalRateLimit);

// 에러 처리
app.use(notFoundHandler);
app.use(errorHandler);
```

## 📊 사용 사례별 비교

| 사용 사례 | MCP 서버 | HTTP 서버 | 하이브리드 |
|-----------|----------|-----------|------------|
| Cursor에서 사용 | ✅ | ❌ | ✅ |
| Claude Desktop에서 사용 | ✅ | ❌ | ✅ |
| 웹 브라우저에서 사용 | ❌ | ✅ | ✅ |
| Postman으로 테스트 | ❌ | ✅ | ✅ |
| 다른 서비스에서 호출 | ❌ | ✅ | ✅ |
| 개발/디버깅 | ❌ | ✅ | ✅ |
| 프로덕션 사용 | ✅ | ❌ | ✅ |

## 🚀 실행 방법

```bash
# 하이브리드 서버 실행
npm run start-hybrid

# 출력 예시
환경변수 검증 완료: { ... }
실제 결제 서비스가 초기화되었습니다.
Hybrid MCP server up. HTTP: http://0.0.0.0:3000
```

## 🔍 실제 사용 예시

### MCP 클라이언트에서 사용
```json
// Cursor에서 MCP 도구 호출
{
  "tool": "test_payment",
  "parameters": {
    "orderId": "TEST_001",
    "amount": 1000,
    "goodsName": "테스트 상품",
    "buyerName": "홍길동",
    "buyerEmail": "test@example.com",
    "buyerTel": "010-1234-5678",
    "returnUrl": "https://example.com/return",
    "notifyUrl": "https://example.com/notify",
    "testMode": true
  }
}
```

### HTTP 클라이언트에서 사용
```bash
# curl로 HTTP API 호출
curl -X POST http://localhost:3000/mcp/test_payment \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "orderId": "TEST_001",
    "amount": 1000,
    "goodsName": "테스트 상품",
    "buyerName": "홍길동",
    "buyerEmail": "test@example.com",
    "buyerTel": "010-1234-5678",
    "returnUrl": "https://example.com/return",
    "notifyUrl": "https://example.com/notify",
    "testMode": true
  }'
```

## ⚡ 성능 고려사항

### 1. **메모리 사용량**
- 하나의 프로세스에서 두 서버 실행
- 공통 서비스 인스턴스 공유 (paymentTestService, realPaymentService)
- 메모리 효율적

### 2. **처리량**
- MCP: stdio 기반으로 높은 처리량
- HTTP: Express 기반으로 안정적인 처리량
- Rate Limiting으로 과부하 방지

### 3. **확장성**
- 수평 확장: 여러 인스턴스 실행 가능
- 수직 확장: 더 강력한 서버로 업그레이드 가능

## 🛡️ 보안 고려사항

### 1. **인증**
- MCP: 클라이언트별 인증 (stdio)
- HTTP: API 키 기반 인증

### 2. **Rate Limiting**
- 엔드포인트별 차등 적용
- IP별 요청 제한
- API 키별 사용량 제한

### 3. **에러 처리**
- 통합된 에러 핸들링
- 민감한 정보 마스킹
- 로깅 및 모니터링

## 📈 모니터링

```typescript
// 헬스체크 엔드포인트
app.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}));
```

하이브리드 서버는 **최고의 유연성과 편의성**을 제공하는 아키텍처입니다! 🎯
