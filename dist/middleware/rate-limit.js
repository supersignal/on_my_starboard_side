import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
/**
 * API 키 기반 Rate Limiting
 * 각 API 키별로 개별 제한을 적용합니다.
 */
export const createApiKeyRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    return rateLimit({
        windowMs,
        max,
        keyGenerator: (req) => {
            // API 키가 있으면 API 키로, 없으면 IP로 구분 (IPv6 지원)
            if (req.apiKey) {
                return req.apiKey;
            }
            // IPv6 주소를 안전하게 처리
            const ip = req.ip || req.connection?.remoteAddress || 'unknown';
            return ipKeyGenerator(ip);
        },
        message: {
            error: 'Too many requests',
            message: `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000 / 60} minutes.`,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
            const apiKey = req.apiKey;
            const identifier = apiKey ? `API Key: ${apiKey.substring(0, 8)}...` : `IP: ${req.ip}`;
            console.warn(`[RATE_LIMIT] Exceeded for ${identifier}`);
            res.status(429).json({
                error: 'Too many requests',
                message: `Rate limit exceeded for ${identifier}`,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};
/**
 * 검색 API 전용 Rate Limiting
 */
export const searchRateLimit = createApiKeyRateLimit(15 * 60 * 1000, // 15분
50 // 최대 50회 검색
);
/**
 * 일반 API Rate Limiting
 */
export const generalRateLimit = createApiKeyRateLimit(15 * 60 * 1000, // 15분
200 // 최대 200회 요청
);
/**
 * 헬스체크용 Rate Limiting
 */
export const healthRateLimit = createApiKeyRateLimit(1 * 60 * 1000, // 1분
10 // 최대 10회
);
