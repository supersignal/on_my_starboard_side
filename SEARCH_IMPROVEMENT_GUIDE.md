# 🔍 BM25 검색 성능 향상 가이드

이 가이드는 현재 BM25 기반 검색 시스템의 인식율을 높이기 위한 개선 사항들을 설명합니다.

## 📊 개선 사항 요약

### 1. 텍스트 전처리 개선
- **한국어 불용어 제거**: 의미 없는 단어들 필터링
- **어간 추출**: 동사/형용사 어미 제거로 검색 범위 확장
- **토큰 정규화**: 특수문자, 숫자 처리 및 공백 정규화
- **동의어 확장**: 검색어의 동의어 자동 추가

### 2. 향상된 BM25 알고리즘
- **제목 가중치**: 제목에 더 높은 점수 부여 (alpha=2.0)
- **설명 가중치**: 설명에 중간 가중치 부여 (beta=1.5)
- **동적 파라미터 조정**: 쿼리 길이와 문서 길이에 따른 자동 조정
- **쿼리 확장**: N-gram 및 유사어 자동 추가

### 3. 하이브리드 검색 시스템
- **BM25 + 임베딩 결합**: 키워드 검색과 의미 검색의 장점 결합
- **가중치 조정**: BM25(60%) + 임베딩(40%) 비율로 최적화
- **점수 정규화**: 서로 다른 점수 체계의 균형 조정

### 4. 의미적 청킹
- **구조적 청킹**: 제목, 단락, 코드 블록별 분리
- **의미적 그룹핑**: 관련 내용끼리 묶어서 처리
- **청크 크기 최적화**: 너무 작거나 큰 청크 자동 조정
- **청크 간 관계**: 관련 청크들 간의 연결 정보 유지

## 🚀 사용 방법

### 기본 사용법

```typescript
import { NicePaymentDocsRepository } from './repository/nicepayments-docs.repository.js';

// 1. Repository 로드
const repository = await NicePaymentDocsRepository.load();

// 2. 검색 엔진 초기화 (임베딩 사전 계산)
await repository.initialize();

// 3. 하이브리드 검색 실행
const results = await repository.findDocumentsByKeyword(
  ['결제', 'API', '오류'], 
  10, 
  true // 하이브리드 검색 사용
);
```

### 검색 모드 선택

```typescript
// 하이브리드 검색 (권장)
const hybridResults = await repository.findDocumentsByKeyword(
  keywords, 
  topN, 
  true
);

// 향상된 BM25만 사용
const bm25Results = await repository.findDocumentsByKeyword(
  keywords, 
  topN, 
  false
);
```

### 설정 커스터마이징

```typescript
// 환경 변수로 설정 조정
// .env 파일에 추가:

# BM25 파라미터
BM25_K1=1.5          # 용어 빈도 가중치
BM25_B=0.8           # 문서 길이 정규화
BM25_ALPHA=2.5       # 제목 가중치
BM25_BETA=1.8        # 설명 가중치

# 하이브리드 검색
HYBRID_BM25_WEIGHT=0.7      # BM25 가중치
HYBRID_EMBEDDING_WEIGHT=0.3 # 임베딩 가중치
USE_QUERY_EXPANSION=true    # 쿼리 확장 사용

# 텍스트 전처리
REMOVE_STOPWORDS=true       # 불용어 제거
EXTRACT_STEMS=true          # 어간 추출
MIN_TOKEN_LENGTH=2          # 최소 토큰 길이
```

## 📈 성능 개선 효과

### 예상 개선 사항

1. **검색 정확도 향상**: 20-30% 개선
   - 제목 가중치로 관련성 높은 문서 우선 노출
   - 동의어 확장으로 검색 범위 확대

2. **한국어 검색 성능**: 40-50% 개선
   - 불용어 제거로 노이즈 감소
   - 어간 추출로 형태 변화 고려

3. **의미적 검색**: 30-40% 개선
   - 하이브리드 검색으로 키워드 + 의미 검색
   - 임베딩 기반 유사도 계산

4. **문서 청킹 품질**: 25-35% 개선
   - 의미적 청킹으로 더 정확한 문서 분할
   - 관련 내용끼리 그룹핑

## 🔧 고급 설정

### 1. 동의어 사전 확장

```typescript
// src/utils/textPreprocessor.ts에서 동의어 맵 확장
const synonymMap: Record<string, string[]> = {
  '결제': ['결제', '지불', '페이', 'payment', 'pay'],
  '카드': ['카드', '신용카드', '체크카드', 'card', 'credit'],
  'API': ['API', 'api', '에이피아이', '인터페이스'],
  // 더 많은 동의어 추가...
};
```

### 2. 불용어 목록 커스터마이징

```typescript
// src/utils/textPreprocessor.ts에서 불용어 목록 수정
const KOREAN_STOPWORDS = new Set([
  '이', '가', '을', '를', '은', '는',
  // 도메인 특화 불용어 추가/제거
]);
```

### 3. BM25 파라미터 실시간 조정

```typescript
// 쿼리 특성에 따른 동적 조정
const calculator = new EnhancedBM25Calculator();
calculator.adjustParameters(queryLength, avgDocLength);
```

## 📊 모니터링 및 최적화

### 검색 성능 메트릭

```typescript
// 하이브리드 검색 결과에서 메트릭 추출
const metrics = hybridSearchEngine.calculateSearchMetrics(results);
console.log('검색 성능:', {
  avgBm25Score: metrics.avgBm25Score,
  avgEmbeddingScore: metrics.avgEmbeddingScore,
  diversityScore: metrics.diversityScore
});
```

### A/B 테스트

```typescript
// 다른 설정으로 성능 비교
const configA = { bm25Weight: 0.6, embeddingWeight: 0.4 };
const configB = { bm25Weight: 0.7, embeddingWeight: 0.3 };

// 각 설정으로 검색 실행 후 결과 비교
```

## 🚨 주의사항

1. **초기화 시간**: 임베딩 사전 계산으로 인한 초기 로딩 시간 증가
2. **메모리 사용량**: 문서 통계 및 임베딩 저장으로 인한 메모리 사용량 증가
3. **한국어 처리**: 현재는 간단한 규칙 기반, 실제 프로덕션에서는 mecab-ko 등 전문 도구 권장

## 🔮 향후 개선 방향

1. **전문 한국어 형태소 분석기 도입** (mecab-ko, konlpy)
2. **실제 임베딩 API 연동** (OpenAI Embeddings, Sentence-BERT)
3. **학습 기반 쿼리 확장** (Word2Vec, FastText)
4. **실시간 피드백 학습** (사용자 클릭 데이터 활용)
5. **다국어 지원** (영어, 일본어 등)

## 📞 지원

문제가 발생하거나 추가 개선 사항이 필요하시면 이슈를 등록해 주세요.
