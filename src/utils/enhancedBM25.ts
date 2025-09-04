import { NicePaymentsDocument } from "../document/nicepayments-document.js";
import { DocumentChunk } from "../document/document-chunk.js";
import { CONFIG } from '../config/index.js';
import { TextPreprocessor } from './textPreprocessor.js';

export interface EnhancedBM25Result {
  id: number;
  chunkId: number;
  score: number;
  relevanceScore: number; // 추가적인 관련성 점수
  matchedTerms: string[]; // 매칭된 용어들
}

export interface BM25Config {
  k1: number;
  b: number;
  k3: number; // 쿼리 용어 가중치
  alpha: number; // 제목 가중치
  beta: number; // 설명 가중치
}

export class EnhancedBM25Calculator {
  private config: BM25Config;
  private documentStats: Map<number, DocumentStats> = new Map();
  private globalTermStats: Map<string, GlobalTermStats> = new Map();

  constructor(config?: Partial<BM25Config>) {
    this.config = {
      k1: config?.k1 ?? CONFIG.search.bm25.k1,
      b: config?.b ?? CONFIG.search.bm25.b,
      k3: config?.k3 ?? 1.2,
      alpha: config?.alpha ?? 2.0, // 제목에 더 높은 가중치
      beta: config?.beta ?? 1.5,   // 설명에 중간 가중치
    };
  }

  /**
   * 문서 통계 정보 사전 계산
   */
  precomputeDocumentStats(documents: NicePaymentsDocument[]): void {
    const allChunks = documents.flatMap(doc => doc.getChunks());
    
    // 전체 문서 수
    const N = allChunks.length;
    
    // 전체 단어 수 계산
    const totalWords = allChunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
    const avgDocLength = totalWords / N;

    // 각 청크별 통계 계산
    for (const chunk of allChunks) {
      const processedText = TextPreprocessor.preprocessText(chunk.text);
      const processedTitle = TextPreprocessor.preprocessText(chunk.originTitle);
      
      const termFreq = this.calculateTermFrequency(processedText);
      const titleTermFreq = this.calculateTermFrequency(processedTitle);
      
      this.documentStats.set(chunk.chunkId, {
        termFrequency: termFreq,
        titleTermFrequency: titleTermFreq,
        wordCount: chunk.wordCount,
        avgDocLength,
        totalDocs: N
      });

      // 전역 용어 통계 업데이트
      this.updateGlobalTermStats(termFreq, titleTermFreq);
    }
  }

  /**
   * 개선된 BM25 점수 계산
   */
  calculateScores(
    query: string,
    documents: NicePaymentsDocument[],
    topN: number = 10
  ): EnhancedBM25Result[] {
    if (this.documentStats.size === 0) {
      this.precomputeDocumentStats(documents);
    }

    const queryTerms = TextPreprocessor.preprocessQuery(query);
    const allChunks = documents.flatMap(doc => doc.getChunks());
    
    const results: EnhancedBM25Result[] = [];

    for (const chunk of allChunks) {
      const stats = this.documentStats.get(chunk.chunkId);
      if (!stats) continue;

      const { score, matchedTerms, relevanceScore } = this.calculateChunkScore(
        queryTerms,
        chunk,
        stats
      );

      if (score > 0) {
        results.push({
          id: chunk.id,
          chunkId: chunk.chunkId,
          score,
          relevanceScore,
          matchedTerms
        });
      }
    }

    // 점수 기반 정렬 (BM25 점수 + 관련성 점수)
    results.sort((a, b) => {
      const scoreA = a.score + a.relevanceScore;
      const scoreB = b.score + b.relevanceScore;
      return scoreB - scoreA;
    });

    return results.slice(0, topN);
  }

  /**
   * 개별 청크의 BM25 점수 계산
   */
  private calculateChunkScore(
    queryTerms: string[],
    chunk: DocumentChunk,
    stats: DocumentStats
  ): { score: number; matchedTerms: string[]; relevanceScore: number } {
    let bm25Score = 0;
    let relevanceScore = 0;
    const matchedTerms: string[] = [];

    for (const term of queryTerms) {
      const globalStats = this.globalTermStats.get(term);
      if (!globalStats) continue;

      // 기본 BM25 계산
      const tf = stats.termFrequency.get(term) || 0;
      const titleTf = stats.titleTermFrequency.get(term) || 0;
      
      if (tf === 0 && titleTf === 0) continue;

      matchedTerms.push(term);

      // IDF 계산
      const idf = Math.log((stats.totalDocs - globalStats.docFrequency + 0.5) / 
                          (globalStats.docFrequency + 0.5));

      // 본문 BM25 점수
      const bodyScore = this.calculateBM25Component(tf, stats.wordCount, stats.avgDocLength, idf);
      
      // 제목 가중치 적용
      const titleScore = this.calculateBM25Component(titleTf, 10, 10, idf) * this.config.alpha;
      
      bm25Score += bodyScore + titleScore;

      // 관련성 점수 (용어 빈도 기반)
      relevanceScore += (tf + titleTf * this.config.alpha) * globalStats.importance;
    }

    return { score: bm25Score, matchedTerms, relevanceScore };
  }

  /**
   * BM25 구성 요소 계산
   */
  private calculateBM25Component(
    tf: number,
    docLength: number,
    avgDocLength: number,
    idf: number
  ): number {
    const numerator = tf * (this.config.k1 + 1);
    const denominator = tf + this.config.k1 * (1 - this.config.b + this.config.b * (docLength / avgDocLength));
    return idf * (numerator / denominator);
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
   * 전역 용어 통계 업데이트
   */
  private updateGlobalTermStats(
    termFreq: Map<string, number>,
    titleTermFreq: Map<string, number>
  ): void {
    const allTerms = new Set([...termFreq.keys(), ...titleTermFreq.keys()]);
    
    for (const term of allTerms) {
      const existing = this.globalTermStats.get(term) || {
        docFrequency: 0,
        totalFrequency: 0,
        titleFrequency: 0,
        importance: 1.0
      };

      existing.docFrequency += 1;
      existing.totalFrequency += termFreq.get(term) || 0;
      existing.titleFrequency += titleTermFreq.get(term) || 0;
      
      // 중요도 계산 (제목에서 자주 나오는 용어에 높은 가중치)
      existing.importance = 1.0 + (existing.titleFrequency / Math.max(existing.totalFrequency, 1)) * 0.5;

      this.globalTermStats.set(term, existing);
    }
  }

  /**
   * 동적 파라미터 조정
   */
  adjustParameters(queryLength: number, avgDocLength: number): void {
    // 쿼리 길이에 따른 k1 조정
    if (queryLength > 5) {
      this.config.k1 = Math.min(this.config.k1 * 1.1, 2.0);
    } else if (queryLength < 3) {
      this.config.k1 = Math.max(this.config.k1 * 0.9, 0.5);
    }

    // 문서 길이에 따른 b 조정
    if (avgDocLength > 200) {
      this.config.b = Math.min(this.config.b * 1.1, 0.9);
    } else if (avgDocLength < 50) {
      this.config.b = Math.max(this.config.b * 0.9, 0.3);
    }
  }

  /**
   * 쿼리 확장을 통한 검색 성능 향상
   */
  expandQuery(query: string): string[] {
    const originalTerms = TextPreprocessor.preprocessQuery(query);
    const expandedTerms = new Set(originalTerms);

    // N-gram 추가
    const ngrams = TextPreprocessor.generateNGrams(query, 2);
    ngrams.forEach(ngram => expandedTerms.add(ngram));

    // 유사 용어 추가 (간단한 규칙 기반)
    for (const term of originalTerms) {
      const similarTerms = this.findSimilarTerms(term);
      similarTerms.forEach(similar => expandedTerms.add(similar));
    }

    return Array.from(expandedTerms);
  }

  /**
   * 유사 용어 찾기 (간단한 편집 거리 기반)
   */
  private findSimilarTerms(term: string, maxDistance: number = 1): string[] {
    const similarTerms: string[] = [];
    
    for (const [candidate, stats] of this.globalTermStats) {
      if (candidate === term) continue;
      
      const distance = this.calculateEditDistance(term, candidate);
      if (distance <= maxDistance && stats.docFrequency > 1) {
        similarTerms.push(candidate);
      }
    }
    
    return similarTerms.slice(0, 3); // 최대 3개만 반환
  }

  /**
   * 편집 거리 계산 (Levenshtein distance)
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

interface DocumentStats {
  termFrequency: Map<string, number>;
  titleTermFrequency: Map<string, number>;
  wordCount: number;
  avgDocLength: number;
  totalDocs: number;
}

interface GlobalTermStats {
  docFrequency: number;
  totalFrequency: number;
  titleFrequency: number;
  importance: number;
}
