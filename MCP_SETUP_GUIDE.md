# MCP 서버 구성 가이드

## 🚀 빠른 시작

### 1. 환경 설정

#### 필수 환경변수 (.env 파일)
```bash
# 서버 설정
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# 문서 데이터 소스 (GitHub 원격 참조)
NICEPAY_DATA_PATH=https://github.com/supersignal/going_on_hypersonic/blob/main/src/llm/llms.txt
NICEPAY_BASE_URL=https://github.com/supersignal/going_on_hypersonic/blob/main
NICEPAY_MARKDOWN_PATH=/markdown
NICEPAY_LLM_PATH=/src/llm

# 검색 엔진 설정
BM25_K1=1.2
BM25_B=0.75
MAX_SEARCH_RESULTS=10

# 하이브리드 검색 설정
HYBRID_BM25_WEIGHT=0.6
HYBRID_EMBEDDING_WEIGHT=0.4
USE_QUERY_EXPANSION=true
MIN_SEARCH_SCORE=0.1

# 텍스트 전처리 설정
REMOVE_STOPWORDS=true
EXTRACT_STEMS=true
MIN_TOKEN_LENGTH=2
MAX_NGRAM_SIZE=3
```

### 2. 설치 및 빌드

```bash
# 의존성 설치
npm install

# TypeScript 빌드
npm run build

# 타입 체크
npm run typecheck
```

### 3. MCP 서버 실행

#### MCP 서버 (stdio) - Cursor 연동용
```bash
npm start
# 또는
node dist/server.js
```

#### HTTP API 서버
```bash
npm run start-http
# 또는
node dist/server.http.js
```

#### 하이브리드 서버 (MCP + HTTP)
```bash
npm run start-hybrid
# 또는
node dist/server.hybrid.js
```

## 🔌 Cursor IDE 연동

### Cursor 설정 파일 (.cursor/mcp.json)
### cwd(current work directory)는 절대경로가 기본값으로 /data/supersignal/ 이 경로는 편의상 개발서버의 임의의 위치를 기록한 것입니다.
```json
{
  "mcpServers": {
    "nicepayments": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/data/supersignal/on_my_starboard_side",
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Cursor에서 MCP 서버 연결 확인
1. Cursor IDE 재시작
2. MCP Tools 패널에서 "nicepayments" 서버 확인
3. 도구 목록: `get_documents`, `document-details`

## 🛠️ 핵심 컴포넌트

### 1. MCP 서버 (src/server.ts)
- **역할**: stdio 프로토콜로 MCP 클라이언트와 통신
- **도구**: 
  - `get_documents`: 키워드 기반 문서 검색
  - `document-details`: 문서 ID로 상세 조회

### 2. 서비스 레이어 (src/schemas/service.ts)
- **역할**: MCP 도구 요청 처리 및 비즈니스 로직
- **기능**: 키워드 검색, 에러 처리, 로깅

### 3. 저장소 레이어 (src/repository/)
- **역할**: 문서 데이터 관리 및 검색 엔진
- **검색 방식**: 
  - 하이브리드 검색 (BM25 + 임베딩)
  - 향상된 BM25
  - 기본 BM25

### 4. 문서 처리 (src/document/)
- **역할**: GitHub에서 마크다운 문서 로드 및 파싱
- **기능**: 메타데이터 추출, 청킹, 키워드 생성

## 🔍 검색 엔진 구성

### 1. 하이브리드 검색 (기본)
- BM25 + 임베딩 벡터 검색
- 쿼리 확장 및 텍스트 전처리
- 가중치: BM25(60%) + 임베딩(40%)

### 2. 향상된 BM25
- 제목/설명 가중치 적용
- N-gram 기반 토큰화
- 정지어 제거 및 어간 추출

### 3. 기본 BM25
- 전통적인 BM25 알고리즘
- 키워드 매칭 기반

## 🚨 문제 해결

### 1. "no tools or prompts" 오류
**원인**: MCP 서버 연결 실패
**해결책**:
```bash
# 1. 서버 상태 확인
node dist/server.js

# 2. 환경변수 확인
echo $NICEPAY_DATA_PATH

# 3. 네트워크 연결 확인
curl -I https://github.com/supersignal/going_on_hypersonic/blob/main/src/llm/llms.txt
```

### 2. 문서 로딩 실패
**원인**: GitHub 접근 권한 또는 네트워크 문제
**해결책**:
```bash
# 로컬 파일 사용
NICEPAY_DATA_PATH=./src/llm/llms.txt npm start
```

### 3. 검색 결과 없음
**원인**: 문서 인덱싱 실패 또는 키워드 불일치
**해결책**:
```bash
# 디버그 모드로 실행
LOG_LEVEL=debug npm start
```

### 4. 빌드 오류
**원인**: TypeScript 설정 또는 의존성 문제
**해결책**:
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# TypeScript 설정 확인
npx tsc --noEmit
```

## 📊 성능 최적화

### 1. 메모리 사용량 최적화
- 문서 청킹 크기 조정
- 검색 결과 제한 (MAX_SEARCH_RESULTS)
- 캐싱 전략 적용

### 2. 검색 성능 향상
- 하이브리드 검색 가중치 튜닝
- BM25 파라미터 최적화
- 텍스트 전처리 설정 조정

### 3. 네트워크 최적화
- GitHub API 호출 최소화
- 문서 캐싱 전략
- 연결 풀링 설정

## 🔧 고급 설정

### 1. 커스텀 검색 엔진
```typescript
// src/repository/nicepayments-docs.repository.ts
const customSearchEngine = new HybridSearchEngine({
  bm25Weight: 0.7,        // BM25 가중치 증가
  embeddingWeight: 0.3,    // 임베딩 가중치 감소
  useQueryExpansion: true  // 쿼리 확장 활성화
});
```

### 2. 로깅 설정
```typescript
// src/utils/logger.ts
const logger = Logger.getInstance();
logger.setLevel('debug');  // debug, info, warn, error
```

### 3. 에러 처리
```typescript
// src/schemas/service.ts
try {
  const result = await repository.findDocumentsByKeyword(keywords);
  return { content: [{ type: "text", text: result }] };
} catch (error) {
  return {
    content: [{ type: "text", text: `검색 실패: ${error.message}` }],
    isError: true
  };
}
```

## 📝 모니터링 및 디버깅

### 1. 로그 레벨 설정
```bash
# 개발 환경
LOG_LEVEL=debug npm start

# 프로덕션 환경
LOG_LEVEL=info npm start
```

### 2. 성능 메트릭
- 문서 로딩 시간
- 검색 응답 시간
- 메모리 사용량
- 에러 발생률

### 3. 헬스 체크
```bash
# HTTP 서버 헬스 체크
curl http://localhost:3000/health

# MCP 서버 상태 확인
node -e "console.log('MCP Server Status: OK')"
```

## 🚀 배포 가이드

### 1. 프로덕션 빌드
```bash
# 최적화된 빌드
NODE_ENV=production npm run build

# 의존성 최적화
npm ci --only=production
```

### 2. 환경별 설정
```bash
# 개발 환경
NODE_ENV=development LOG_LEVEL=debug

# 프로덕션 환경
NODE_ENV=production LOG_LEVEL=info
```

### 3. 서비스 등록
```bash
# systemd 서비스 등록 (Linux)
sudo systemctl enable nicepayments-mcp
sudo systemctl start nicepayments-mcp
```

이 가이드를 따라하면 MCP 서버를 성공적으로 구성하고 Cursor IDE와 연동할 수 있습니다.

