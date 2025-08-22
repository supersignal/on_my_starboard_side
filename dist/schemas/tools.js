import { z } from 'zod';
export const GetDocumentSchema = z.object({
    keywords: z.array(z.string().min(1)).min(1).max(10).describe("검색할 키워드 배열 (1-10개)"),
    maxResults: z.number().min(1).max(50).optional().default(10).describe("최대 검색 결과 수"),
    includeMetadata: z.boolean().optional().default(false).describe("메타데이터 포함 여부")
});
export const DocumentDetailsSchema = z.object({
    id: z.string().describe("문서 ID"),
    includeChunks: z.boolean().optional().default(true).describe("청크 정보 포함 여부")
});
export const SearchHistorySchema = z.object({
    limit: z.number().min(1).max(100).optional().default(20).describe("검색 히스토리 제한 수")
});
