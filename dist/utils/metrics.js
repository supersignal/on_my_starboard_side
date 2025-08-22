export class Metrics {
    searchCount = 0;
    searchLatency = [];
    errorCount = 0;
    recordSearch(latency) {
        this.searchCount++;
        this.searchLatency.push(latency);
        // 최근 100개만 유지
        if (this.searchLatency.length > 100) {
            this.searchLatency.shift();
        }
    }
    recordError() {
        this.errorCount++;
    }
    getStats() {
        const avgLatency = this.searchLatency.length > 0
            ? this.searchLatency.reduce((a, b) => a + b, 0) / this.searchLatency.length
            : 0;
        return {
            totalSearches: this.searchCount,
            averageLatency: avgLatency,
            totalErrors: this.errorCount,
            successRate: this.searchCount > 0 ? ((this.searchCount - this.errorCount) / this.searchCount) * 100 : 0
        };
    }
}
