import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  hash?: string;
}

/**
 * 문서 캐싱 유틸리티
 */
export class DocumentCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number; // Time To Live in milliseconds

  constructor(ttlMinutes: number = 30) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * 캐시에서 데이터 조회
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // TTL 확인
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 캐시에 데이터 저장
   */
  set(key: string, data: T, etag?: string): void {
    const hash = this.generateHash(data);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
      hash
    });
  }

  /**
   * ETag 기반 캐시 확인
   */
  getWithETag(key: string, currentETag?: string): { data: T | null; cached: boolean } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { data: null, cached: false };
    }

    // TTL 확인
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return { data: null, cached: false };
    }

    // ETag 비교
    if (currentETag && entry.etag && entry.etag !== currentETag) {
      return { data: null, cached: false };
    }

    return { data: entry.data, cached: true };
  }

  /**
   * 데이터 해시 생성
   */
  private generateHash(data: T): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * 캐시 무효화
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 전체 캐시 클리어
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 캐시 통계
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

