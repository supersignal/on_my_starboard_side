import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isNativeError } from "node:util/types";
import { z } from "zod";
//import dotenv from 'dotenv';
import { validateEnv } from './config/validation.js';

//환경변수 로드 및 검증
//dotenv.config();
const env = validateEnv();
console.log('환경변수 검증 완료:', env);

const server = new McpServer({
  name: "nicepayments-integration-guide",
  description: "MCP-compatible toolset for integrating with nicepayments systems. Includes tools for retrieving LLM-structured text and fetching actual documentation through URLs. (나이스페이먼츠 시스템과의 연동을 위한 MCP 도구 모음입니다. LLM이 활용할 수 있는 텍스트 및 관련 문서를 가져오는 기능을 포함합니다.)",
  version: "1.0.0",
});

import {
  // getV1DocumentsByKeyword,
  // getV2DocumentsByKeyword,
  getDocumentsByKeyword,
  repository,
} from "./schemas/service.js";

// const server = new McpServer({
//   name: "nicepayments-integration-guide",
//   description:
//     "MCP-compatible toolset for integrating with nicepayments systems. Includes tools for retrieving LLM-structured text and fetching actual documentation through URLs. (나이스페이먼츠 시스템과의 연동을 위한 MCP 도구 모음입니다. LLM이 활용할 수 있는 텍스트 및 관련 문서를 가져오는 기능을 포함합니다.)",
//   version: "1.0.0",
// });

// 문서 검색 스키마
const GetDocumentSchema = {
  keywords: z.array(z.string()).describe("UTF-8 인코딩된 문자열 배열"),
};

// get_documents 단일 엔드포인트로 통합
server.tool(
  "get_documents",
  `나이스페이먼츠 문서들을 버전 구분 없이 조회합니다.\n키워드 기반으로 v1, v2, general 문서를 모두 검색합니다.`,
  GetDocumentSchema,
  async ({ keywords }: { keywords: string[] }) => {
    // 키워드 기반 전체 문서 검색
    return await getDocumentsByKeyword(keywords);
  }
);

server.tool(
  "document-details",
  `문서의 원본 ID 로 해당 문서의 전체 내용을 조회합니다.`,
  { id: z.string().describe("문서별 id 값") },
  async ({ id }: { id: string }) => {
    try {
      const docs = repository.findOneById(Number(id));
      return { content: [{ type: "text", text: docs.content }] };
    } catch (e) {
      const errorMessage = isNativeError(e) ? e.message : "unknown error";
      return {
        content: [
          { type: "text", text: `문서 가져오기 실패: ${errorMessage}` },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

