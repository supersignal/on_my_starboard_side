/**
 * 순환 버퍼 구현 - 메모리 효율적인 데이터 저장
 */
export class CircularBuffer {
    buffer;
    head = 0;
    tail = 0;
    count = 0;
    capacity;
    constructor(capacity) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }
    /**
     * 요소 추가
     */
    push(item) {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        if (this.count < this.capacity) {
            this.count++;
        }
        else {
            this.head = (this.head + 1) % this.capacity;
        }
    }
    /**
     * 모든 요소 반환
     */
    toArray() {
        if (this.count === 0)
            return [];
        const result = [];
        for (let i = 0; i < this.count; i++) {
            const index = (this.head + i) % this.capacity;
            result.push(this.buffer[index]);
        }
        return result;
    }
    /**
     * 평균값 계산 (숫자 타입용)
     */
    average() {
        if (this.count === 0)
            return 0;
        const numbers = this.toArray();
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }
    /**
     * 현재 저장된 요소 개수
     */
    size() {
        return this.count;
    }
    /**
     * 버퍼가 비어있는지 확인
     */
    isEmpty() {
        return this.count === 0;
    }
    /**
     * 버퍼가 가득 찼는지 확인
     */
    isFull() {
        return this.count === this.capacity;
    }
}
