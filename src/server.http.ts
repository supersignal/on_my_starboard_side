import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { validateEnv } from './config/validation.js';
import { getDocumentsByKeyword, repository } from './schemas/service.js';

// ✅ GitHub Service
import { GithubService } from "./schemas/githubService.js";

// ✅ Payment Test Service
import { 
    PaymentRequestZodSchema, 
    CancelRequestZodSchema, 
    PaymentStatusZodSchema,
    paymentTestService 
} from "./schemas/paymentService.js";

// ✅ Real Payment Service
import { 
    RealPaymentRequestZodSchema, 
    RealCancelRequestZodSchema, 
    RealPaymentStatusZodSchema,
    createRealPaymentService 
} from "./schemas/realPaymentService.js";

const env = validateEnv();

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

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// 헬스체크
app.get('/health', (_req, res) => {
    res.json({ ok: true, env: { node: process.version, port: PORT } });
});

// 문서 검색
app.post('/mcp/get_documents', async (req, res) => {
    const schema = z.object({ keywords: z.array(z.string()).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ isError: true, error: parsed.error.flatten() });
    }
    try {
        const result = await getDocumentsByKeyword(parsed.data.keywords);
        res.json(result);
    } catch (e) {
        res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
});

// 문서 상세
app.get('/mcp/document-details/:id', async (req, res) => {
    const idStr = req.params.id;
    const idNum = Number(idStr);
    if (!Number.isFinite(idNum)) {
        return res.status(400).json({ isError: true, error: 'invalid id' });
    }
    try {
        const doc = repository.findOneById(idNum);
        if (!doc) return res.status(404).json({ isError: true, error: 'not found' });
        res.json({ content: [{ type: 'text', text: doc.content }] });
    } catch (e) {
        res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
});

// 결제 테스트 API 엔드포인트들
app.post('/mcp/test_payment', async (req, res) => {
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
});

app.post('/mcp/test_cancel', async (req, res) => {
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
});

app.post('/mcp/test_payment_status', async (req, res) => {
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
});

app.post('/mcp/test_clear_data', async (_req, res) => {
    try {
        paymentTestService.clearTestData();
        res.json({ content: [{ type: 'text', text: '테스트 데이터가 성공적으로 초기화되었습니다.' }] });
    } catch (e) {
        res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
});

app.get('/mcp/test_list_payments', async (_req, res) => {
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
});

// 실제 결제 API 엔드포인트들 (설정이 있는 경우에만)
if (realPaymentService) {
  app.post('/mcp/real_payment', async (req, res) => {
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
  });

  app.post('/mcp/real_cancel', async (req, res) => {
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
  });

  app.post('/mcp/real_payment_status', async (req, res) => {
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
  });

  app.get('/mcp/real_payment_config', async (_req, res) => {
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
  });
} else {
  app.get('/mcp/real_payment_info', async (_req, res) => {
    res.json({ 
      content: [{ 
        type: 'text', 
        text: `실제 결제 서비스가 설정되지 않았습니다.\n\n설정 방법:\n1. 나이스페이먼츠와 계약 체결\n2. 상점 ID와 키 발급\n3. 환경변수 설정:\n   - NICEPAY_MERCHANT_ID=your_merchant_id\n   - NICEPAY_MERCHANT_KEY=your_merchant_key\n   - NICEPAY_TEST_MODE=false\n\n자세한 내용은 PAYMENT_TEST_GUIDE.md를 참고하세요.`
      }] 
    });
  });
}

app.listen(PORT, () => {
    console.log(`HTTP server listening on http://0.0.0.0:${PORT}`);
});
