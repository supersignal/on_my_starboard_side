import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { isNativeError } from "node:util/types";
import { validateEnv } from './config/validation.js';
import {
  getDocumentsByKeyword,
  repository,
} from "./schemas/service.js";
import { apiKeyAuth, optionalApiKeyAuth, AuthenticatedRequest } from './middleware/auth.js';
import { searchRateLimit, generalRateLimit, healthRateLimit } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler, requestIdMiddleware, asyncHandler } from './middleware/error-handler.js';
import { Request, Response } from 'express';

// 환경변수 검증
const env = validateEnv();
console.log('환경변수 검증 완료:', env);

// MCP 서버 인스턴스
const mcpServer = new McpServer({
  name: "nicepayments-integration-guide",
  description: "MCP-compatible toolset for integrating with nicepayments systems.",
  version: "1.0.0",
});

// 공용 Zod 스키마
const GetDocumentSchema = {
  keywords: z.array(z.string()).describe("UTF-8 인코딩된 문자열 배열"),
};

// MCP 툴 등록
mcpServer.tool(
  "get_documents",
  `나이스페이먼츠 문서들을 버전 구분 없이 조회합니다.\n키워드 기반으로 v1, v2, general 문서를 모두 검색합니다.`,
  GetDocumentSchema,
  async ({ keywords }: { keywords: string[] }) => {
    return await getDocumentsByKeyword(keywords);
  }
);

mcpServer.tool(
  "document-details",
  `문서의 원본 ID 로 해당 문서의 전체 내용을 조회합니다.`,
  { id: z.string().describe("문서별 id 값") },
  async ({ id }: { id: string }) => {
    try {
      const docId = parseInt(id);
      if (isNaN(docId)) {
        return {
          content: [{ type: "text", text: "잘못된 문서 ID 형식입니다. 숫자를 입력해주세요." }],
          isError: true,
        };
      }
      const docs = repository.findOneById(docId);
      if (!docs) {
        return {
          content: [{ type: "text", text: `ID ${id}에 해당하는 문서를 찾을 수 없습니다.` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: docs.content }] };
    } catch (e) {
      const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
      return {
        content: [{ type: "text", text: `문서 가져오기 실패: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// HTTP 서버 (외부 접근용 REST 브리지)
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// 기본 미들웨어
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use(requestIdMiddleware);

// 보안 미들웨어 적용
app.use('/mcp', apiKeyAuth); // MCP 엔드포인트는 API 키 필수
app.use('/health', optionalApiKeyAuth); // 헬스체크는 선택적 인증

// Rate Limiting 적용
app.use('/health', healthRateLimit);
app.use('/mcp/get_documents', searchRateLimit);
app.use('/mcp/document-details', generalRateLimit);

// 헬스체크 엔드포인트
app.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}));

// 문서 검색 엔드포인트
app.post('/mcp/get_documents', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({ 
    keywords: z.array(z.string().min(1)).min(1).max(10).describe("검색 키워드 배열 (1-10개)")
  });
  
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ 
      isError: true, 
      error: 'Invalid request',
      details: parsed.error.flatten()
    });
  }
  
  const result = await getDocumentsByKeyword(parsed.data.keywords);
  res.json(result);
}));

// 문서 상세 조회 엔드포인트
app.get('/mcp/document-details/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  
  if (!Number.isFinite(id) || id < 0) {
    return res.status(400).json({ 
      isError: true, 
      error: 'Invalid document ID',
      message: 'Document ID must be a positive number'
    });
  }
  
  const doc = repository.findOneById(id);
  if (!doc) {
    return res.status(404).json({ 
      isError: true, 
      error: 'Document not found',
      message: `Document with ID ${id} not found`
    });
  }
  
  res.json({ content: [{ type: 'text', text: doc.content }] });
}));

// 404 핸들러
app.use(notFoundHandler);

// 글로벌 에러 핸들러
app.use(errorHandler);

async function main() {
  // 1) 로컬(MCP 클라이언트)용 stdio 연결
  const stdio = new StdioServerTransport();
  await mcpServer.connect(stdio);

  // 2) 외부 접근용 HTTP 서버 기동
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hybrid MCP server up. HTTP: http://0.0.0.0:${PORT}`);
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});


