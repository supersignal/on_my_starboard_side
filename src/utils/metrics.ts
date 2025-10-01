import { CircularBuffer } from './circularBuffer.js';

export class Metrics {
    private searchCount = 0;
    private searchLatency: CircularBuffer<number>;
    private errorCount = 0;
  
    constructor(maxLatencyRecords: number = 100) {
      this.searchLatency = new CircularBuffer(maxLatencyRecords);
    }
  
    recordSearch(latency: number) {
      this.searchCount++;
      this.searchLatency.push(latency);
    }
  
    recordError() {
      this.errorCount++;
    }
  
    getStats() {
      const avgLatency = this.searchLatency.isEmpty() 
        ? 0 
        : this.searchLatency.average();
  
      return {
        totalSearches: this.searchCount,
        averageLatency: Math.round(avgLatency * 100) / 100, // 소수점 2자리 반올림
        totalErrors: this.errorCount,
        successRate: this.searchCount > 0 
          ? Math.round(((this.searchCount - this.errorCount) / this.searchCount) * 100 * 100) / 100 
          : 0,
        recentLatencies: this.searchLatency.toArray()
      };
    }

    /**
     * 메트릭 초기화
     */
    reset() {
      this.searchCount = 0;
      this.errorCount = 0;
      this.searchLatency = new CircularBuffer(100);
    }
  }