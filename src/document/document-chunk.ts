export interface DocumentChunk {
  id: number; // 문서 ID
  chunkId: number; // 청크 ID
  originTitle: string; // 원본 문서 제목
  text: string; // 청크 텍스트 내용
  wordCount: number; // 단어 수
} 