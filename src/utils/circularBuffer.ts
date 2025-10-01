/**
 * 순환 버퍼 구현 - 메모리 효율적인 데이터 저장
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * 요소 추가
   */
  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * 모든 요소 반환 (최적화된 버전)
   */
  toArray(): T[] {
    if (this.count === 0) return [];
    
    const result: T[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      result[i] = this.buffer[index];
    }
    return result;
  }

  /**
   * 평균값 계산 (숫자 타입용)
   */
  average(): number {
    if (this.count === 0) return 0;
    
    const numbers = this.toArray() as number[];
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * 현재 저장된 요소 개수
   */
  size(): number {
    return this.count;
  }

  /**
   * 버퍼가 비어있는지 확인
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * 버퍼가 가득 찼는지 확인
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }
}

