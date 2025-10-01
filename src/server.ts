#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isNativeError } from "node:util/types";
import { z } from "zod";
import { validateEnv } from './config/validation.js';
import {
    getDocumentsByKeyword,
    repository,
} from "./schemas/service.js";
import { SystemPrompt } from "./constants/base-prompt.js";

// ✅ GitHub Service
import { GithubService } from "./schemas/githubService.js";

// ✅ Payment Test Service
import { 
    PaymentRequestSchema, 
    CancelRequestSchema, 
    PaymentStatusSchema,
    paymentTestService 
} from "./schemas/paymentService.js";

// ✅ Real Payment Service
import { 
    RealPaymentRequestSchema, 
    RealCancelRequestSchema, 
    RealPaymentStatusSchema,
    createRealPaymentService 
} from "./schemas/realPaymentService.js";

//환경변수 로드 및 검증
const env = validateEnv();
console.log('환경변수 검증 완료:', env);

// 실제 결제 서비스 초기화 (설정이 있는 경우에만)
let realPaymentService: any = null;
try {
  if (env.NICEPAY_MERCHANT_ID && env.NICEPAY_MERCHANT_KEY) {
    realPaymentService = createRealPaymentService();
    console.log('실제 결제 서비스가 초기화되었습니다.');
  } else {
    console.log('나이스페이먼츠 설정이 없어 실제 결제 서비스를 사용할 수 없습니다.');
  }
} catch (error) {
  console.warn('실제 결제 서비스 초기화 실패:', error);
}

const server = new McpServer({
    name: "nicepayments-developers-guide",
    description: "MCP-compatible toolset for integrating with nicepayments systems. Includes tools for retrieving LLM-structured text and fetching actual documentation through URLs. (나이스페이먼츠 시스템과의 연동을 위한 MCP 도구 모음입니다. LLM이 활용할 수 있는 텍스트 및 관련 문서를 가져오는 기능을 포함합니다.)",
    version: "1.0.0",
});

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

// 결제 테스트 도구들
server.tool(
    "test_payment",
    `나이스페이먼츠 결제 API 테스트를 수행합니다.\n테스트 모드에서만 동작하며, 실제 결제는 발생하지 않습니다.`,
    PaymentRequestSchema,
    async (request) => {
        try {
            const response = await paymentTestService.processPayment(request);
            return {
                content: [{
                    type: "text",
                    text: `결제 테스트 결과:\n${JSON.stringify(response, null, 2)}`
                }]
            };
        } catch (e) {
            const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
            return {
                content: [{
                    type: "text",
                    text: `결제 테스트 실패: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.tool(
    "test_cancel",
    `나이스페이먼츠 결제 취소 API 테스트를 수행합니다.\n테스트 모드에서만 동작하며, 실제 취소는 발생하지 않습니다.`,
    CancelRequestSchema,
    async (request) => {
        try {
            const response = await paymentTestService.processCancel(request);
            return {
                content: [{
                    type: "text",
                    text: `취소 테스트 결과:\n${JSON.stringify(response, null, 2)}`
                }]
            };
        } catch (e) {
            const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
            return {
                content: [{
                    type: "text",
                    text: `취소 테스트 실패: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.tool(
    "test_payment_status",
    `나이스페이먼츠 결제 상태 조회 API 테스트를 수행합니다.\n테스트 모드에서만 동작합니다.`,
    PaymentStatusSchema,
    async (request) => {
        try {
            const response = await paymentTestService.getPaymentStatus(request);
            return {
                content: [{
                    type: "text",
                    text: `결제 상태 조회 결과:\n${JSON.stringify(response, null, 2)}`
                }]
            };
        } catch (e) {
            const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
            return {
                content: [{
                    type: "text",
                    text: `결제 상태 조회 실패: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.tool(
    "test_clear_data",
    `테스트 데이터를 초기화합니다.\n모든 테스트 결제 및 취소 내역이 삭제됩니다.`,
    {},
    async () => {
        try {
            paymentTestService.clearTestData();
            return {
                content: [{
                    type: "text",
                    text: "테스트 데이터가 성공적으로 초기화되었습니다."
                }]
            };
        } catch (e) {
            const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
            return {
                content: [{
                    type: "text",
                    text: `테스트 데이터 초기화 실패: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

server.tool(
    "test_list_payments",
    `현재 저장된 모든 테스트 결제 내역을 조회합니다.`,
    {},
    async () => {
        try {
            const payments = paymentTestService.getAllTestPayments();
            const cancels = paymentTestService.getAllTestCancels();
            
            const result = {
                payments: payments,
                cancels: cancels,
                summary: {
                    totalPayments: payments.length,
                    totalCancels: cancels.length,
                    successPayments: payments.filter(p => p.status === 'SUCCESS').length,
                    cancelledPayments: payments.filter(p => p.status === 'CANCELLED').length
                }
            };
            
            return {
                content: [{
                    type: "text",
                    text: `테스트 데이터 현황:\n${JSON.stringify(result, null, 2)}`
                }]
            };
        } catch (e) {
            const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
            return {
                content: [{
                    type: "text",
                    text: `테스트 데이터 조회 실패: ${errorMessage}`
                }],
                isError: true
            };
        }
    }
);

// 실제 결제 도구들 (설정이 있는 경우에만)
if (realPaymentService) {
  server.tool(
    "real_payment",
    `나이스페이먼츠 실제 결제 API를 호출합니다.\n⚠️ 주의: 실제 결제가 발생합니다! testMode를 false로 설정해야 합니다.`,
    RealPaymentRequestSchema,
    async (request) => {
      try {
        const response = await realPaymentService.processPayment(request);
        return {
          content: [{
            type: "text",
            text: `실제 결제 결과:\n${JSON.stringify(response, null, 2)}`
          }]
        };
      } catch (e) {
        const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
        return {
          content: [{
            type: "text",
            text: `실제 결제 실패: ${errorMessage}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "real_cancel",
    `나이스페이먼츠 실제 결제 취소 API를 호출합니다.\n⚠️ 주의: 실제 취소가 발생합니다! testMode를 false로 설정해야 합니다.`,
    RealCancelRequestSchema,
    async (request) => {
      try {
        const response = await realPaymentService.processCancel(request);
        return {
          content: [{
            type: "text",
            text: `실제 취소 결과:\n${JSON.stringify(response, null, 2)}`
          }]
        };
      } catch (e) {
        const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
        return {
          content: [{
            type: "text",
            text: `실제 취소 실패: ${errorMessage}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "real_payment_status",
    `나이스페이먼츠 실제 결제 상태 조회 API를 호출합니다.\n⚠️ 주의: 실제 API를 호출합니다! testMode를 false로 설정해야 합니다.`,
    RealPaymentStatusSchema,
    async (request) => {
      try {
        const response = await realPaymentService.getPaymentStatus(request);
        return {
          content: [{
            type: "text",
            text: `실제 결제 상태 조회 결과:\n${JSON.stringify(response, null, 2)}`
          }]
        };
      } catch (e) {
        const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
        return {
          content: [{
            type: "text",
            text: `실제 결제 상태 조회 실패: ${errorMessage}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "real_payment_config",
    `나이스페이먼츠 실제 결제 서비스 설정을 조회합니다.`,
    {},
    async () => {
      try {
        const config = realPaymentService.getConfig();
        // 민감한 정보는 마스킹
        const maskedConfig = {
          ...config,
          merchantKey: config.merchantKey ? '***' + config.merchantKey.slice(-4) : 'Not Set',
          merchantId: config.merchantId || 'Not Set'
        };
        
        return {
          content: [{
            type: "text",
            text: `실제 결제 서비스 설정:\n${JSON.stringify(maskedConfig, null, 2)}`
          }]
        };
      } catch (e) {
        const errorMessage = isNativeError(e) ? e.message : "알 수 없는 오류가 발생했습니다.";
        return {
          content: [{
            type: "text",
            text: `설정 조회 실패: ${errorMessage}`
          }],
          isError: true
        };
      }
    }
  );
} else {
  server.tool(
    "real_payment_info",
    `실제 결제 서비스가 설정되지 않았습니다.\n환경변수 NICEPAY_MERCHANT_ID와 NICEPAY_MERCHANT_KEY를 설정해주세요.`,
    {},
    async () => {
      return {
        content: [{
          type: "text",
          text: `실제 결제 서비스가 설정되지 않았습니다.\n\n설정 방법:\n1. 나이스페이먼츠와 계약 체결\n2. 상점 ID와 키 발급\n3. 환경변수 설정:\n   - NICEPAY_MERCHANT_ID=your_merchant_id\n   - NICEPAY_MERCHANT_KEY=your_merchant_key\n   - NICEPAY_TEST_MODE=false\n\n자세한 내용은 PAYMENT_TEST_GUIDE.md를 참고하세요.`
        }]
      };
    }
  );
}

// 프롬프트 등록
server.prompt(
    "java-spring-expert",
    "Java 21과 Spring Boot 전문가 프롬프트",
    {
        context: z.string().optional().describe("추가 컨텍스트나 요구사항")
    },
    async ({ context }) => {
        const prompt = `${SystemPrompt}${context ? `\n\n추가 컨텍스트: ${context}` : ''}`;
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: prompt
                    }
                }
            ]
        };
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
