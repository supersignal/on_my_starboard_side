import { NicePaymentsDocument } from "../document/nicepayments-document.js";
import { DocumentChunk } from "../document/document-chunk.js";
import { EnhancedBM25Calculator, EnhancedBM25Result } from './enhancedBM25.js';
import { TextPreprocessor } from './textPreprocessor.js';
import { SearchCache } from './searchCache.js';

export interface HybridSearchResult {
  id: number;
  chunkId: number;
  bm25Score: number;
  embeddingScore: number;
  combinedScore: number;
  matchedTerms: string[];
  relevanceScore: number;
}

export interface HybridSearchConfig {
  bm25Weight: number;    // BM25 가중치 (0.0 ~ 1.0)
  embeddingWeight: number; // 임베딩 가중치 (0.0 ~ 1.0)
  minScore: number;      // 최소 점수 임계값
  useQueryExpansion: boolean; // 쿼리 확장 사용 여부
}

/**
 * 하이브리드 검색 엔진
 * BM25와 임베딩 기반 검색을 결합하여 검색 성능 향상
 */
export class HybridSearchEngine {
  private bm25Calculator: EnhancedBM25Calculator;
  private config: HybridSearchConfig;
  private documentEmbeddings: Map<number, number[]> = new Map();
  private searchCache: SearchCache<HybridSearchResult[]>;
  private queryEmbeddings: Map<string, number[]> = new Map();

  constructor(config?: Partial<HybridSearchConfig>) {
    this.config = {
      bm25Weight: config?.bm25Weight ?? 0.6,
      embeddingWeight: config?.embeddingWeight ?? 0.4,
      minScore: config?.minScore ?? 0.1,
      useQueryExpansion: config?.useQueryExpansion ?? true
    };
    
    this.bm25Calculator = new EnhancedBM25Calculator();
    this.searchCache = new SearchCache<HybridSearchResult[]>(50, 10 * 60 * 1000); // 10분 캐시
  }

  /**
   * 문서 임베딩 사전 계산
   * 실제 구현에서는 OpenAI Embeddings API나 로컬 임베딩 모델 사용
   */
  async precomputeEmbeddings(documents: NicePaymentsDocument[]): Promise<void> {
    console.log('[HybridSearch] 임베딩 사전 계산 시작...');
    
    const allChunks = documents.flatMap(doc => doc.getChunks());
    
    for (const chunk of allChunks) {
      // 간단한 TF-IDF 기반 벡터화 (실제로는 더 정교한 임베딩 사용)
      const embedding = await this.computeSimpleEmbedding(chunk.text, chunk.originTitle);
      this.documentEmbeddings.set(chunk.chunkId, embedding);
    }
    
    console.log(`[HybridSearch] ${allChunks.length}개 청크의 임베딩 계산 완료`);
  }

  /**
   * 하이브리드 검색 실행
   */
  async search(
    query: string,
    documents: NicePaymentsDocument[],
    topN: number = 10
  ): Promise<HybridSearchResult[]> {
    // 캐시 키 생성
    const cacheKey = `${query.toLowerCase()}_${topN}`;
    
    // 캐시에서 결과 조회
    const cachedResult = this.searchCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    // 1. 쿼리 전처리 및 확장
    const processedQuery = this.config.useQueryExpansion 
      ? this.bm25Calculator.expandQuery(query)
      : TextPreprocessor.preprocessQuery(query);

    // 2. BM25 검색
    const bm25Results = this.bm25Calculator.calculateScores(
      processedQuery.join(' '),
      documents,
      topN * 2 // 더 많은 후보를 가져와서 임베딩 점수와 결합
    );

    // 3. 임베딩 검색
    const queryEmbedding = await this.computeSimpleEmbedding(query, '');
    const embeddingResults = await this.computeEmbeddingScores(
      queryEmbedding,
      bm25Results.map(r => r.chunkId),
      topN * 2
    );

    // 4. 결과 결합
    const combinedResults = this.combineResults(bm25Results, embeddingResults);

    // 5. 점수 기반 정렬 및 필터링
    const finalResults = combinedResults
      .filter(result => result.combinedScore >= this.config.minScore)
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topN);

    // 캐시에 결과 저장
    this.searchCache.set(cacheKey, finalResults);
    
    return finalResults;
  }

  /**
   * 간단한 TF-IDF 기반 임베딩 계산
   * 실제 구현에서는 OpenAI Embeddings API 사용 권장
   */
  private async computeSimpleEmbedding(text: string, title: string): Promise<number[]> {
    const processedText = TextPreprocessor.preprocessText(text);
    const processedTitle = TextPreprocessor.preprocessText(title);
    
    // 전체 용어 집합 생성
    const allTerms = new Set([...processedText, ...processedTitle]);
    const termArray = Array.from(allTerms);
    
    // TF-IDF 벡터 생성
    const vector = new Array(termArray.length).fill(0);
    
    // 본문 TF 계산
    const textTf = this.calculateTermFrequency(processedText);
    const titleTf = this.calculateTermFrequency(processedTitle);
    
    for (let i = 0; i < termArray.length; i++) {
      const term = termArray[i];
      const textFreq = textTf.get(term) || 0;
      const titleFreq = titleTf.get(term) || 0;
      
      // 제목에 더 높은 가중치
      vector[i] = textFreq + titleFreq * 2;
    }
    
    // 벡터 정규화
    return this.normalizeVector(vector);
  }

  /**
   * 임베딩 유사도 점수 계산
   */
  private async computeEmbeddingScores(
    queryEmbedding: number[],
    chunkIds: number[],
    topN: number
  ): Promise<Map<number, number>> {
    const scores = new Map<number, number>();
    
    for (const chunkId of chunkIds) {
      const docEmbedding = this.documentEmbeddings.get(chunkId);
      if (!docEmbedding) continue;
      
      const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
      scores.set(chunkId, similarity);
    }
    
    return scores;
  }

  /**
   * BM25와 임베딩 결과 결합
   */
  private combineResults(
    bm25Results: EnhancedBM25Result[],
    embeddingScores: Map<number, number>
  ): HybridSearchResult[] {
    const results: HybridSearchResult[] = [];
    
    for (const bm25Result of bm25Results) {
      const embeddingScore = embeddingScores.get(bm25Result.chunkId) || 0;
      
      // 점수 정규화 (0-1 범위)
      const normalizedBm25Score = this.normalizeScore(bm25Result.score, bm25Results);
      const normalizedEmbeddingScore = embeddingScore; // 이미 0-1 범위
      
      // 가중 평균으로 결합
      const combinedScore = 
        normalizedBm25Score * this.config.bm25Weight +
        normalizedEmbeddingScore * this.config.embeddingWeight;
      
      results.push({
        id: bm25Result.id,
        chunkId: bm25Result.chunkId,
        bm25Score: normalizedBm25Score,
        embeddingScore: normalizedEmbeddingScore,
        combinedScore,
        matchedTerms: bm25Result.matchedTerms,
        relevanceScore: bm25Result.relevanceScore
      });
    }
    
    return results;
  }

  /**
   * 코사인 유사도 계산
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('벡터 차원이 일치하지 않습니다');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 벡터 정규화
   */
  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return vector;
    
    return vector.map(val => val / norm);
  }

  /**
   * 점수 정규화 (Min-Max 정규화)
   */
  private normalizeScore(score: number, allResults: EnhancedBM25Result[]): number {
    const scores = allResults.map(r => r.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    
    if (maxScore === minScore) return 1;
    
    return (score - minScore) / (maxScore - minScore);
  }

  /**
   * 용어 빈도 계산
   */
  private calculateTermFrequency(tokens: string[]): Map<string, number> {
    const termFreq = new Map<string, number>();
    
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }
    
    return termFreq;
  }

  /**
   * 검색 성능 메트릭 계산
   */
  calculateSearchMetrics(results: HybridSearchResult[]): {
    avgBm25Score: number;
    avgEmbeddingScore: number;
    avgCombinedScore: number;
    diversityScore: number;
  } {
    if (results.length === 0) {
      return { avgBm25Score: 0, avgEmbeddingScore: 0, avgCombinedScore: 0, diversityScore: 0 };
    }

    const avgBm25Score = results.reduce((sum, r) => sum + r.bm25Score, 0) / results.length;
    const avgEmbeddingScore = results.reduce((sum, r) => sum + r.embeddingScore, 0) / results.length;
    const avgCombinedScore = results.reduce((sum, r) => sum + r.combinedScore, 0) / results.length;

    // 다양성 점수 계산 (매칭된 용어의 다양성)
    const allTerms = new Set(results.flatMap(r => r.matchedTerms));
    const diversityScore = allTerms.size / Math.max(results.length, 1);

    return {
      avgBm25Score,
      avgEmbeddingScore,
      avgCombinedScore,
      diversityScore
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<HybridSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
