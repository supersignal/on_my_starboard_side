import crypto from 'crypto';
/**
 * 문서 캐싱 유틸리티
 */
export class DocumentCache {
    cache = new Map();
    ttl; // Time To Live in milliseconds
    constructor(ttlMinutes = 30) {
        this.ttl = ttlMinutes * 60 * 1000;
    }
    /**
     * 캐시에서 데이터 조회
     */
    get(key) {
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
    set(key, data, etag) {
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
    getWithETag(key, currentETag) {
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
    generateHash(data) {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.createHash('md5').update(str).digest('hex');
    }
    /**
     * 캐시 무효화
     */
    invalidate(key) {
        this.cache.delete(key);
    }
    /**
     * 전체 캐시 클리어
     */
    clear() {
        this.cache.clear();
    }
    /**
     * 캐시 통계
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
    /**
     * 만료된 캐시 정리
     */
    cleanup() {
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
