import { z } from 'zod';
const envSchema = z.object({
    NICEPAY_DATA_PATH: z.string().default('./llm/llms.txt'),
    BM25_K1: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(10)).default('1.2'),
    BM25_B: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0).max(1)).default('0.75'),
    LOG_LEVEL: z.enum(['debug', 'info', 'error']).default('info'),
    MAX_SEARCH_RESULTS: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('10'),
    PORT: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(65535)).default('3000'),
    NODE_ENV: z.enum(['development', 'production']).default('development'),
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
