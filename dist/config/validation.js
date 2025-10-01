import { z } from 'zod';
const envSchema = z.object({
    NICEPAY_DATA_PATH: z.string().default('./src/llm/llms.txt'),
    BM25_K1: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(10)).default('1.2'),
    BM25_B: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default('0.75'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    MAX_SEARCH_RESULTS: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('10'),
    PORT: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(65535)).default('3000'),
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    // 나이스페이먼츠 실제 결제 설정
    NICEPAY_MERCHANT_ID: z.string().optional().describe("나이스페이먼츠 상점 ID"),
    NICEPAY_MERCHANT_KEY: z.string().optional().describe("나이스페이먼츠 상점 키"),
    NICEPAY_BASE_URL: z.string().url().default('https://api.nicepay.co.kr').describe("나이스페이먼츠 API 기본 URL"),
    NICEPAY_TEST_MODE: z.string().transform(val => val === 'true').pipe(z.boolean()).default('true').describe("나이스페이먼츠 테스트 모드 여부"),
    // API 키 설정
    API_KEYS: z.string().optional().describe("API 키 목록 (쉼표로 구분)"),
});
export const validateEnv = () => {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        console.error('환경변수 검증 실패:', error);
        process.exit(1);
    }
};
