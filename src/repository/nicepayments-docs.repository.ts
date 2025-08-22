import { parseLLMText } from "../document/parseLLMText.js";
import { NicePaymentsDocument } from "../document/nicepayments-document.js";
//import { categories, Category } from "../constants/category.js";
import {
  BM25Result,
  calculateBM25ScoresByKeywords,
} from "../utils/calculateBM25.js";
import { NicePaymentsDocumentLoader } from "../document/nicepayments-document.loader.js";
import { MarkdownDocumentFetcher } from "../document/markdown-document.fetcher.js";
import { DocumentChunk } from "../document/document-chunk.js";
import path from "node:path";
import { GITHUB_CONFIG } from '../config/index.js';
import { Logger } from '../utils/logger.js';
//import { CONFIG } from '../config/index.js';

export class NicePaymentDocsRepository {
//  static async load(link = "https://github.com/supersignal/going_on_hypersonic/blob/main/llm/llms.txt") {
  static async load(
    link = process.env.NICEPAY_DATA_PATH ||
           GITHUB_CONFIG.baseUrl+GITHUB_CONFIG.llmPath+"/llms.txt"
  ) {
    let llmText: string;
    try {
      if (/^https?:\/\//i.test(link)) {
        const response = await fetch(link);
        if (!response.ok) {
          throw new Error(`원격 파일 요청 실패: HTTP ${response.status}`);
        }
        llmText = await response.text();
        console.log("[DEBUG] 원격 llms.txt 정상 로드:", llmText.length, "bytes");
      } else {
        // 로컬 파일 읽기
        const fs = await import('fs/promises');
        const filePath = path.resolve(link.replace(/^file:\/\//, ''));
        llmText = await fs.readFile(filePath, 'utf-8');
        console.log("[DEBUG] 로컬 llms.txt 정상 로드:", llmText.length, "bytes");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[ERROR] llms.txt 파일 로드 실패:", errorMessage);
      throw new Error(`문서 파일을 읽을 수 없습니다: ${errorMessage}`);
    }

    const rawDocs = parseLLMText(llmText);
    console.log("[DEBUG] parseLLMText 결과:", rawDocs.length, "개 문서");

    const loader = new NicePaymentsDocumentLoader(
      rawDocs,
      new MarkdownDocumentFetcher()
    );

    await loader.load();
    console.log("[DEBUG] 문서 로딩 완료, 문서 개수:", loader.getDocuments().length);

    const documents = loader.getDocuments();

    return new NicePaymentDocsRepository(documents);
  }

  constructor(
    private readonly documents: NicePaymentsDocument[],
  ) {}

  async findDocumentsByKeyword(
    keywords: string[],
    topN: number = 10
  ): Promise<string> {
    // [디버그] 검색 키워드 입력값 출력
    this.log('debug', 'findDocumentsByKeyword - 입력 키워드:', keywords);
    const result = await this.getDocumentsByKeywordForLLM(
      this.documents,
      keywords,
      topN
    );
    // [디버그] getDocumentsByKeywordForLLM 반환값 출력
    this.log('debug', 'findDocumentsByKeyword - getDocumentsByKeywordForLLM 반환값:', result);
    if (!result || result.trim() === "") {
      console.log("[DEBUG] BM25 검색 결과 없음");
    } else {
      console.log("[DEBUG] BM25 검색 결과 있음");
    }
    return result;
  }

  findOneById(id: number) {
    return this.documents[id];
  }

  private async getDocumentsByKeywordForLLM(
    documents: NicePaymentsDocument[],
    keywords: string[],
    topN: number = 10
  ): Promise<string> {
    // [디버그] BM25 점수 계산 전 입력값 출력
    this.log('debug', 'getDocumentsByKeywordForLLM - 입력 keywords:', keywords);
    const results = calculateBM25ScoresByKeywords(
      keywords.join("|"),
      documents
    );
    // [디버그] BM25 점수 결과 상위 3개 출력
    this.log('debug', 'getDocumentsByKeywordForLLM - BM25 결과:', { length: results.length, top3: results.slice(0, 3) });
    const docs = results
      .slice(0, topN)
      .map((item) => this.findChunkByBM25Result(item))
      .filter((item) => item !== undefined)
      .map((items) => this.normalizeChunks(items));

    // [디버그] 정제된 청크 결과 출력
    console.log('[DEBUG][repository] getDocumentsByKeywordForLLM - 정제된 청크:', docs);
    return docs.join("\n\n");
  }

  private findChunkByBM25Result(item: BM25Result) {
    const document = this.findOneById(item.id);
    return document.getChunkWithWindow(item.chunkId, 1);
  }

  private normalizeChunk(chunk: DocumentChunk): string {
    return `## 원본문서 제목 : ${chunk.originTitle}\n* 원본문서 ID : ${chunk.id}\n\n${chunk.text}`;
  }

  private normalizeChunks(chunks: DocumentChunk[]): string {
    // [디버그] normalizeChunks 입력값 출력
    this.log('debug', 'normalizeChunks - 입력 청크:', chunks);
    return `## 원본문서 제목 : ${chunks[0].originTitle}\n* 원본문서 ID : ${
      chunks[0].id
    }\n\n${chunks.map((chunk) => chunk.text).join("\n\n")}`;
  }

  private log(level: 'debug' | 'info' | 'error', message: string, data?: any) {
    const logger = Logger.getInstance();
    logger[level](`[repository] ${message}`, data);
  }

} 