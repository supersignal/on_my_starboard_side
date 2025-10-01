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

// ✅ GitHub Service
import { GithubService } from "./schemas/githubService.js";

// ✅ Payment Test Service
import { 
    PaymentRequestSchema, 
    CancelRequestSchema, 
    PaymentStatusSchema,
    PaymentRequestZodSchema,
    CancelRequestZodSchema,
    PaymentStatusZodSchema,
    paymentTestService 
} from "./schemas/paymentService.js";

// ✅ Real Payment Service
import { 
    RealPaymentRequestSchema, 
    RealCancelRequestSchema, 
    RealPaymentStatusSchema,
    RealPaymentRequestZodSchema,
    RealCancelRequestZodSchema,
    RealPaymentStatusZodSchema,
    createRealPaymentService 
} from "./schemas/realPaymentService.js";

// 환경변수 검증
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

// 결제 테스트 MCP 도구들
mcpServer.tool(
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

mcpServer.tool(
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

mcpServer.tool(
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

mcpServer.tool(
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

mcpServer.tool(
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

// 실제 결제 MCP 도구들 (설정이 있는 경우에만)
if (realPaymentService) {
  mcpServer.tool(
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

  mcpServer.tool(
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

  mcpServer.tool(
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

  mcpServer.tool(
    "real_payment_config",
    `나이스페이먼츠 실제 결제 서비스 설정을 조회합니다.`,
    {},
    async () => {
      try {
        const config = realPaymentService.getConfig();
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
  mcpServer.tool(
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
app.use('/mcp/test_payment', generalRateLimit);
app.use('/mcp/test_cancel', generalRateLimit);
app.use('/mcp/test_payment_status', generalRateLimit);
app.use('/mcp/test_clear_data', generalRateLimit);
app.use('/mcp/test_list_payments', generalRateLimit);
app.use('/mcp/real_payment', generalRateLimit);
app.use('/mcp/real_cancel', generalRateLimit);
app.use('/mcp/real_payment_status', generalRateLimit);
app.use('/mcp/real_payment_config', generalRateLimit);

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

// 결제 테스트 API 엔드포인트들
app.post('/mcp/test_payment', asyncHandler(async (req: Request, res: Response) => {
  const parsed = PaymentRequestZodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ isError: true, error: parsed.error.flatten() });
  }
  try {
    const response = await paymentTestService.processPayment(parsed.data);
    res.json({ content: [{ type: 'text', text: `결제 테스트 결과:\n${JSON.stringify(response, null, 2)}` }] });
  } catch (e) {
    res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
  }
}));

app.post('/mcp/test_cancel', asyncHandler(async (req: Request, res: Response) => {
  const parsed = CancelRequestZodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ isError: true, error: parsed.error.flatten() });
  }
  try {
    const response = await paymentTestService.processCancel(parsed.data);
    res.json({ content: [{ type: 'text', text: `취소 테스트 결과:\n${JSON.stringify(response, null, 2)}` }] });
  } catch (e) {
    res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
  }
}));

app.post('/mcp/test_payment_status', asyncHandler(async (req: Request, res: Response) => {
  const parsed = PaymentStatusZodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ isError: true, error: parsed.error.flatten() });
  }
  try {
    const response = await paymentTestService.getPaymentStatus(parsed.data);
    res.json({ content: [{ type: 'text', text: `결제 상태 조회 결과:\n${JSON.stringify(response, null, 2)}` }] });
  } catch (e) {
    res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
  }
}));

app.post('/mcp/test_clear_data', asyncHandler(async (req: Request, res: Response) => {
  try {
    paymentTestService.clearTestData();
    res.json({ content: [{ type: 'text', text: '테스트 데이터가 성공적으로 초기화되었습니다.' }] });
  } catch (e) {
    res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
  }
}));

app.get('/mcp/test_list_payments', asyncHandler(async (req: Request, res: Response) => {
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
    
    res.json({ content: [{ type: 'text', text: `테스트 데이터 현황:\n${JSON.stringify(result, null, 2)}` }] });
  } catch (e) {
    res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
  }
}));

// 실제 결제 API 엔드포인트들 (설정이 있는 경우에만)
if (realPaymentService) {
  app.post('/mcp/real_payment', asyncHandler(async (req: Request, res: Response) => {
    const parsed = RealPaymentRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ isError: true, error: parsed.error.flatten() });
    }
    try {
      const response = await realPaymentService.processPayment(parsed.data);
      res.json({ content: [{ type: 'text', text: `실제 결제 결과:\n${JSON.stringify(response, null, 2)}` }] });
    } catch (e) {
      res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
  }));

  app.post('/mcp/real_cancel', asyncHandler(async (req: Request, res: Response) => {
    const parsed = RealCancelRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ isError: true, error: parsed.error.flatten() });
    }
    try {
      const response = await realPaymentService.processCancel(parsed.data);
      res.json({ content: [{ type: 'text', text: `실제 취소 결과:\n${JSON.stringify(response, null, 2)}` }] });
    } catch (e) {
      res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
  }));

  app.post('/mcp/real_payment_status', asyncHandler(async (req: Request, res: Response) => {
    const parsed = RealPaymentStatusZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ isError: true, error: parsed.error.flatten() });
    }
    try {
      const response = await realPaymentService.getPaymentStatus(parsed.data);
      res.json({ content: [{ type: 'text', text: `실제 결제 상태 조회 결과:\n${JSON.stringify(response, null, 2)}` }] });
    } catch (e) {
      res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
  }));

  app.get('/mcp/real_payment_config', asyncHandler(async (req: Request, res: Response) => {
    try {
      const config = realPaymentService.getConfig();
      const maskedConfig = {
        ...config,
        merchantKey: config.merchantKey ? '***' + config.merchantKey.slice(-4) : 'Not Set',
        merchantId: config.merchantId || 'Not Set'
      };
      res.json({ content: [{ type: 'text', text: `실제 결제 서비스 설정:\n${JSON.stringify(maskedConfig, null, 2)}` }] });
    } catch (e) {
      res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
  }));
} else {
  app.get('/mcp/real_payment_info', asyncHandler(async (req: Request, res: Response) => {
    res.json({ 
      content: [{ 
        type: 'text', 
        text: `실제 결제 서비스가 설정되지 않았습니다.\n\n설정 방법:\n1. 나이스페이먼츠와 계약 체결\n2. 상점 ID와 키 발급\n3. 환경변수 설정:\n   - NICEPAY_MERCHANT_ID=your_merchant_id\n   - NICEPAY_MERCHANT_KEY=your_merchant_key\n   - NICEPAY_TEST_MODE=false\n\n자세한 내용은 PAYMENT_TEST_GUIDE.md를 참고하세요.`
      }] 
    });
  }));
}

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


