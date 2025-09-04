import { parseLLMText } from "../document/parseLLMText.js";
//import { categories, Category } from "../constants/category.js";
import { calculateBM25ScoresByKeywords, } from "../utils/calculateBM25.js";
import { HybridSearchEngine } from "../utils/hybridSearch.js";
import { EnhancedBM25Calculator } from "../utils/enhancedBM25.js";
import { NicePaymentsDocumentLoader } from "../document/nicepayments-document.loader.js";
import { MarkdownDocumentFetcher } from "../document/markdown-document.fetcher.js";
import path from "node:path";
import { GITHUB_CONFIG } from '../config/index.js';
import { Logger } from '../utils/logger.js';
//import { CONFIG } from '../config/index.js';
export class NicePaymentDocsRepository {
    documents;
    hybridSearchEngine;
    enhancedBM25Calculator;
    isInitialized = false;
    //  static async load(link = "https://github.com/supersignal/going_on_hypersonic/blob/main/llm/llms.txt") {
    static async load(link = process.env.NICEPAY_DATA_PATH ||
        GITHUB_CONFIG.baseUrl + GITHUB_CONFIG.llmPath + "/llms.txt") {
        let llmText;
        try {
            if (/^https?:\/\//i.test(link)) {
                const response = await fetch(link);
                if (!response.ok) {
                    throw new Error(`원격 파일 요청 실패: HTTP ${response.status}`);
                }
                llmText = await response.text();
                console.log("[DEBUG] 원격 llms.txt 정상 로드:", llmText.length, "bytes");
            }
            else {
                // 로컬 파일 읽기
                const fs = await import('fs/promises');
                const filePath = path.resolve(link.replace(/^file:\/\//, ''));
                llmText = await fs.readFile(filePath, 'utf-8');
                console.log("[DEBUG] 로컬 llms.txt 정상 로드:", llmText.length, "bytes");
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("[ERROR] llms.txt 파일 로드 실패:", errorMessage);
            throw new Error(`문서 파일을 읽을 수 없습니다: ${errorMessage}`);
        }
        const rawDocs = parseLLMText(llmText);
        console.log("[DEBUG] parseLLMText 결과:", rawDocs.length, "개 문서");
        const loader = new NicePaymentsDocumentLoader(rawDocs, new MarkdownDocumentFetcher());
        await loader.load();
        console.log("[DEBUG] 문서 로딩 완료, 문서 개수:", loader.getDocuments().length);
        const documents = loader.getDocuments();
        return new NicePaymentDocsRepository(documents);
    }
    constructor(documents) {
        this.documents = documents;
        this.hybridSearchEngine = new HybridSearchEngine({
            bm25Weight: 0.6,
            embeddingWeight: 0.4,
            useQueryExpansion: true
        });
        this.enhancedBM25Calculator = new EnhancedBM25Calculator();
    }
    /**
     * 검색 엔진 초기화 (임베딩 사전 계산)
     */
    async initialize() {
        if (this.isInitialized)
            return;
        this.log('info', '검색 엔진 초기화 시작...');
        try {
            // 하이브리드 검색 엔진 초기화
            await this.hybridSearchEngine.precomputeEmbeddings(this.documents);
            // 향상된 BM25 계산기 초기화
            this.enhancedBM25Calculator.precomputeDocumentStats(this.documents);
            this.isInitialized = true;
            this.log('info', '검색 엔진 초기화 완료');
        }
        catch (error) {
            this.log('error', '검색 엔진 초기화 실패:', error);
            throw error;
        }
    }
    async findDocumentsByKeyword(keywords, topN = 10, useHybridSearch = true) {
        // [디버그] 검색 키워드 입력값 출력
        this.log('debug', 'findDocumentsByKeyword - 입력 키워드:', keywords);
        // 검색 엔진 초기화 확인
        if (!this.isInitialized) {
            await this.initialize();
        }
        const result = useHybridSearch
            ? await this.getDocumentsByHybridSearch(keywords, topN)
            : await this.getDocumentsByEnhancedBM25(keywords, topN);
        // [디버그] 검색 결과 출력
        this.log('debug', 'findDocumentsByKeyword - 검색 결과:', result);
        if (!result || result.trim() === "") {
            console.log("[DEBUG] 검색 결과 없음");
        }
        else {
            console.log("[DEBUG] 검색 결과 있음");
        }
        return result;
    }
    findOneById(id) {
        return this.documents[id];
    }
    /**
     * 하이브리드 검색을 사용한 문서 검색
     */
    async getDocumentsByHybridSearch(keywords, topN = 10) {
        this.log('debug', 'getDocumentsByHybridSearch - 입력 keywords:', keywords);
        const query = keywords.join(' ');
        const results = await this.hybridSearchEngine.search(query, this.documents, topN);
        this.log('debug', 'getDocumentsByHybridSearch - 하이브리드 검색 결과:', {
            length: results.length,
            top3: results.slice(0, 3).map(r => ({
                chunkId: r.chunkId,
                combinedScore: r.combinedScore,
                matchedTerms: r.matchedTerms
            }))
        });
        const docs = results
            .map((item) => this.findChunkByHybridResult(item))
            .filter((item) => item !== undefined)
            .map((items) => this.normalizeChunks(items));
        this.log('debug', 'getDocumentsByHybridSearch - 정제된 청크:', docs);
        return docs.join("\n\n");
    }
    /**
     * 향상된 BM25를 사용한 문서 검색
     */
    async getDocumentsByEnhancedBM25(keywords, topN = 10) {
        this.log('debug', 'getDocumentsByEnhancedBM25 - 입력 keywords:', keywords);
        const query = keywords.join(' ');
        const results = this.enhancedBM25Calculator.calculateScores(query, this.documents, topN);
        this.log('debug', 'getDocumentsByEnhancedBM25 - 향상된 BM25 결과:', {
            length: results.length,
            top3: results.slice(0, 3).map(r => ({
                chunkId: r.chunkId,
                score: r.score,
                matchedTerms: r.matchedTerms
            }))
        });
        const docs = results
            .map((item) => this.findChunkByEnhancedBM25Result(item))
            .filter((item) => item !== undefined)
            .map((items) => this.normalizeChunks(items));
        this.log('debug', 'getDocumentsByEnhancedBM25 - 정제된 청크:', docs);
        return docs.join("\n\n");
    }
    /**
     * 기존 BM25 검색 (하위 호환성)
     */
    async getDocumentsByKeywordForLLM(documents, keywords, topN = 10) {
        // [디버그] BM25 점수 계산 전 입력값 출력
        this.log('debug', 'getDocumentsByKeywordForLLM - 입력 keywords:', keywords);
        const results = calculateBM25ScoresByKeywords(keywords.join("|"), documents);
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
    findChunkByBM25Result(item) {
        const document = this.findOneById(item.id);
        return document.getChunkWithWindow(item.chunkId, 1);
    }
    findChunkByHybridResult(item) {
        const document = this.findOneById(item.id);
        return document.getChunkWithWindow(item.chunkId, 1);
    }
    findChunkByEnhancedBM25Result(item) {
        const document = this.findOneById(item.id);
        return document.getChunkWithWindow(item.chunkId, 1);
    }
    normalizeChunk(chunk) {
        return `## 원본문서 제목 : ${chunk.originTitle}\n* 원본문서 ID : ${chunk.id}\n\n${chunk.text}`;
    }
    normalizeChunks(chunks) {
        // [디버그] normalizeChunks 입력값 출력
        this.log('debug', 'normalizeChunks - 입력 청크:', chunks);
        return `## 원본문서 제목 : ${chunks[0].originTitle}\n* 원본문서 ID : ${chunks[0].id}\n\n${chunks.map((chunk) => chunk.text).join("\n\n")}`;
    }
    log(level, message, data) {
        const logger = Logger.getInstance();
        logger[level](`[repository] ${message}`, data);
    }
}
