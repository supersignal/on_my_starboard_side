import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";
import { DocumentMetadata } from "./document-metadata.js";
import { TextPreprocessor } from "../utils/textPreprocessor.js";

export interface SemanticChunk {
  id: string;
  content: string;
  title: string;
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'table';
  level: number;
  wordCount: number;
  semanticScore: number;
  keywords: string[];
  parentId?: string;
  children: string[];
}

export interface SemanticDocument {
  metadata: DocumentMetadata;
  chunks: SemanticChunk[];
  chunkGraph: Map<string, string[]>; // 청크 간 관계 그래프
}

/**
 * 의미적 청킹을 수행하는 클래스
 * 문서의 구조와 의미를 고려하여 더 정확한 청킹 수행
 */
export class SemanticChunker {
  private minChunkSize: number;
  private maxChunkSize: number;
  private overlapSize: number;

  constructor(
    minChunkSize: number = 50,
    maxChunkSize: number = 500,
    overlapSize: number = 50
  ) {
    this.minChunkSize = minChunkSize;
    this.maxChunkSize = maxChunkSize;
    this.overlapSize = overlapSize;
  }

  /**
   * 마크다운 문서를 의미적으로 청킹
   */
  chunkDocument(markdown: string, documentId: string): SemanticDocument {
    const metadata = this.extractMetadata(markdown);
    const ast = unified().use(remarkParse).parse(markdown);
    
    const chunks: SemanticChunk[] = [];
    const chunkGraph = new Map<string, string[]>();
    
    // 1단계: 구조적 청킹 (제목, 단락, 코드 블록 등)
    const structuralChunks = this.extractStructuralChunks(ast, documentId);
    
    // 2단계: 의미적 그룹핑
    const semanticGroups = this.groupBySemantics(structuralChunks);
    
    // 3단계: 크기 조정 및 오버랩 추가
    const finalChunks = this.adjustChunkSizes(semanticGroups);
    
    // 4단계: 청크 간 관계 그래프 생성
    this.buildChunkGraph(finalChunks, chunkGraph);
    
    return {
      metadata,
      chunks: finalChunks,
      chunkGraph
    };
  }

  /**
   * 구조적 청킹 수행
   */
  private extractStructuralChunks(ast: any, documentId: string): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    let chunkId = 0;
    let currentChunk: string[] = [];
    let currentTitle = '';
    let currentLevel = 0;
    let currentType: SemanticChunk['type'] = 'paragraph';

    visit(ast, (node) => {
      switch (node.type) {
        case 'heading':
          // 이전 청크 저장
          if (currentChunk.length > 0) {
            chunks.push(this.createChunk(
              `${documentId}_${chunkId++}`,
              currentChunk.join('\n'),
              currentTitle,
              currentType,
              currentLevel,
              documentId
            ));
            currentChunk = [];
          }
          
          // 새 청크 시작
          currentTitle = this.extractTextFromNode(node);
          currentLevel = node.depth;
          currentType = 'heading';
          currentChunk.push(`# ${currentTitle}`);
          break;

        case 'code':
          // 코드 블록은 별도 청크로 처리
          if (currentChunk.length > 0) {
            chunks.push(this.createChunk(
              `${documentId}_${chunkId++}`,
              currentChunk.join('\n'),
              currentTitle,
              currentType,
              currentLevel,
              documentId
            ));
            currentChunk = [];
          }
          
          chunks.push(this.createChunk(
            `${documentId}_${chunkId++}`,
            `\`\`\`${node.lang || ''}\n${node.value}\n\`\`\``,
            currentTitle,
            'code',
            currentLevel,
            documentId
          ));
          break;

        case 'list':
          // 리스트는 별도 청크로 처리
          if (currentChunk.length > 0) {
            chunks.push(this.createChunk(
              `${documentId}_${chunkId++}`,
              currentChunk.join('\n'),
              currentTitle,
              currentType,
              currentLevel,
              documentId
            ));
            currentChunk = [];
          }
          
          const listContent = this.extractListContent(node);
          chunks.push(this.createChunk(
            `${documentId}_${chunkId++}`,
            listContent,
            currentTitle,
            'list',
            currentLevel,
            documentId
          ));
          break;

        case 'table':
          // 테이블은 별도 청크로 처리
          if (currentChunk.length > 0) {
            chunks.push(this.createChunk(
              `${documentId}_${chunkId++}`,
              currentChunk.join('\n'),
              currentTitle,
              currentType,
              currentLevel,
              documentId
            ));
            currentChunk = [];
          }
          
          const tableContent = this.extractTableContent(node);
          chunks.push(this.createChunk(
            `${documentId}_${chunkId++}`,
            tableContent,
            currentTitle,
            'table',
            currentLevel,
            documentId
          ));
          break;

        default:
          if ('value' in node && typeof node.value === 'string') {
            currentChunk.push(node.value);
          }
          break;
      }
    });

    // 마지막 청크 저장
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(
        `${documentId}_${chunkId++}`,
        currentChunk.join('\n'),
        currentTitle,
        currentType,
        currentLevel,
        documentId
      ));
    }

    return chunks;
  }

  /**
   * 의미적 그룹핑 수행
   */
  private groupBySemantics(chunks: SemanticChunk[]): SemanticChunk[] {
    const groupedChunks: SemanticChunk[] = [];
    let i = 0;

    while (i < chunks.length) {
      const currentChunk = chunks[i];
      
      // 제목 청크인 경우
      if (currentChunk.type === 'heading') {
        const relatedChunks = this.findRelatedChunks(chunks, i);
        
        if (relatedChunks.length > 1) {
          // 관련 청크들을 하나로 합침
          const combinedContent = relatedChunks.map(c => c.content).join('\n\n');
          const combinedChunk = this.createChunk(
            currentChunk.id,
            combinedContent,
            currentChunk.title,
            currentChunk.type,
            currentChunk.level,
            currentChunk.id.split('_')[0]
          );
          
          groupedChunks.push(combinedChunk);
          i += relatedChunks.length;
        } else {
          groupedChunks.push(currentChunk);
          i++;
        }
      } else {
        groupedChunks.push(currentChunk);
        i++;
      }
    }

    return groupedChunks;
  }

  /**
   * 관련 청크 찾기
   */
  private findRelatedChunks(chunks: SemanticChunk[], startIndex: number): SemanticChunk[] {
    const relatedChunks: SemanticChunk[] = [chunks[startIndex]];
    const currentLevel = chunks[startIndex].level;
    
    for (let i = startIndex + 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // 더 높은 레벨의 제목이 나오면 중단
      if (chunk.type === 'heading' && chunk.level <= currentLevel) {
        break;
      }
      
      relatedChunks.push(chunk);
    }
    
    return relatedChunks;
  }

  /**
   * 청크 크기 조정 및 오버랩 추가
   */
  private adjustChunkSizes(chunks: SemanticChunk[]): SemanticChunk[] {
    const adjustedChunks: SemanticChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      if (chunk.wordCount < this.minChunkSize && i < chunks.length - 1) {
        // 너무 작은 청크는 다음 청크와 합침
        const nextChunk = chunks[i + 1];
        const combinedContent = `${chunk.content}\n\n${nextChunk.content}`;
        
        const combinedChunk = this.createChunk(
          `${chunk.id}_combined`,
          combinedContent,
          chunk.title,
          chunk.type,
          chunk.level,
          chunk.id.split('_')[0]
        );
        
        adjustedChunks.push(combinedChunk);
        i++; // 다음 청크 건너뛰기
      } else if (chunk.wordCount > this.maxChunkSize) {
        // 너무 큰 청크는 분할
        const splitChunks = this.splitLargeChunk(chunk);
        adjustedChunks.push(...splitChunks);
      } else {
        adjustedChunks.push(chunk);
      }
    }
    
    return adjustedChunks;
  }

  /**
   * 큰 청크 분할
   */
  private splitLargeChunk(chunk: SemanticChunk): SemanticChunk[] {
    const sentences = chunk.content.split(/[.!?]\s+/);
    const splitChunks: SemanticChunk[] = [];
    let currentContent: string[] = [];
    let currentWordCount = 0;
    let splitIndex = 0;

    for (const sentence of sentences) {
      const sentenceWordCount = sentence.split(/\s+/).length;
      
      if (currentWordCount + sentenceWordCount > this.maxChunkSize && currentContent.length > 0) {
        // 현재 청크 저장
        splitChunks.push(this.createChunk(
          `${chunk.id}_split_${splitIndex++}`,
          currentContent.join('. ') + '.',
          chunk.title,
          chunk.type,
          chunk.level,
          chunk.id.split('_')[0]
        ));
        
        currentContent = [sentence];
        currentWordCount = sentenceWordCount;
      } else {
        currentContent.push(sentence);
        currentWordCount += sentenceWordCount;
      }
    }

    // 마지막 청크 저장
    if (currentContent.length > 0) {
      splitChunks.push(this.createChunk(
        `${chunk.id}_split_${splitIndex++}`,
        currentContent.join('. ') + '.',
        chunk.title,
        chunk.type,
        chunk.level,
        chunk.id.split('_')[0]
      ));
    }

    return splitChunks;
  }

  /**
   * 청크 간 관계 그래프 생성
   */
  private buildChunkGraph(chunks: SemanticChunk[], chunkGraph: Map<string, string[]>): void {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const relatedChunks: string[] = [];
      
      // 이전 청크와의 관계
      if (i > 0) {
        const prevChunk = chunks[i - 1];
        if (this.areChunksRelated(chunk, prevChunk)) {
          relatedChunks.push(prevChunk.id);
        }
      }
      
      // 다음 청크와의 관계
      if (i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        if (this.areChunksRelated(chunk, nextChunk)) {
          relatedChunks.push(nextChunk.id);
        }
      }
      
      // 의미적으로 유사한 청크 찾기
      const similarChunks = this.findSemanticallySimilarChunks(chunk, chunks);
      relatedChunks.push(...similarChunks.map(c => c.id));
      
      chunkGraph.set(chunk.id, [...new Set(relatedChunks)]);
    }
  }

  /**
   * 청크 간 관련성 판단
   */
  private areChunksRelated(chunk1: SemanticChunk, chunk2: SemanticChunk): boolean {
    // 같은 제목 하위에 있는지 확인
    if (chunk1.title === chunk2.title) return true;
    
    // 키워드 유사도 확인
    const similarity = this.calculateKeywordSimilarity(chunk1.keywords, chunk2.keywords);
    return similarity > 0.3;
  }

  /**
   * 의미적으로 유사한 청크 찾기
   */
  private findSemanticallySimilarChunks(targetChunk: SemanticChunk, allChunks: SemanticChunk[]): SemanticChunk[] {
    const similarChunks: SemanticChunk[] = [];
    
    for (const chunk of allChunks) {
      if (chunk.id === targetChunk.id) continue;
      
      const similarity = this.calculateKeywordSimilarity(targetChunk.keywords, chunk.keywords);
      if (similarity > 0.5) {
        similarChunks.push(chunk);
      }
    }
    
    return similarChunks.slice(0, 3); // 최대 3개만 반환
  }

  /**
   * 키워드 유사도 계산
   */
  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * 청크 생성 헬퍼
   */
  private createChunk(
    id: string,
    content: string,
    title: string,
    type: SemanticChunk['type'],
    level: number,
    documentId: string
  ): SemanticChunk {
    const wordCount = content.split(/\s+/).length;
    const keywords = TextPreprocessor.preprocessText(content);
    const semanticScore = this.calculateSemanticScore(content, keywords);
    
    return {
      id,
      content,
      title,
      type,
      level,
      wordCount,
      semanticScore,
      keywords,
      children: []
    };
  }

  /**
   * 의미적 점수 계산
   */
  private calculateSemanticScore(content: string, keywords: string[]): number {
    let score = 0;
    
    // 제목 키워드 가중치
    const titleKeywords = TextPreprocessor.preprocessText(content.split('\n')[0] || '');
    score += titleKeywords.length * 2;
    
    // 본문 키워드 가중치
    score += keywords.length;
    
    // 코드 블록 가중치
    if (content.includes('```')) {
      score += 3;
    }
    
    // 리스트 가중치
    if (content.includes('- ') || content.includes('* ')) {
      score += 2;
    }
    
    return score;
  }

  /**
   * 노드에서 텍스트 추출
   */
  private extractTextFromNode(node: any): string {
    if (node.children) {
      return node.children
        .map((child: any) => child.value || '')
        .join('');
    }
    return node.value || '';
  }

  /**
   * 리스트 내용 추출
   */
  private extractListContent(node: any): string {
    // 리스트 노드의 내용을 마크다운 형식으로 변환
    return this.extractTextFromNode(node);
  }

  /**
   * 테이블 내용 추출
   */
  private extractTableContent(node: any): string {
    // 테이블 노드의 내용을 마크다운 형식으로 변환
    return this.extractTextFromNode(node);
  }

  /**
   * 메타데이터 추출
   */
  private extractMetadata(markdown: string): DocumentMetadata {
    const startIndex = markdown.indexOf("***");
    const endIndex = markdown.indexOf("-----", startIndex + 3);

    if (startIndex === -1 || endIndex === -1) {
      return { title: "No Title", description: "No Description", keyword: [] };
    }

    const metadata = markdown.substring(startIndex + 3, endIndex).trim();
    const [rawTitle, rawDescription, rawKeyword] = metadata
      .split("\n")
      .map((line) => line.trim());

    const titleMatch = rawTitle?.match(/title:\s*(.*)/);
    const descriptionMatch = rawDescription?.match(/description:\s*(.*)/);
    const keywordMatch = rawKeyword?.match(/keyword:\s*(.*)/);

    return {
      title: titleMatch ? titleMatch[1].trim() : "No Title",
      description: descriptionMatch ? descriptionMatch[1].trim() : "No Description",
      keyword: keywordMatch ? keywordMatch[1].split(",").map((k) => k.trim()) : [],
    };
  }
}
