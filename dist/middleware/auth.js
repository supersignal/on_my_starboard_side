import { SecurityUtils } from '../utils/security.js';
/**
 * API 키 인증 미들웨어
 * X-API-Key 헤더를 통해 인증을 수행합니다.
 */
export const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({
            error: 'API key required',
            message: 'X-API-Key header is required'
        });
    }
    // 환경변수에서 유효한 API 키 목록 가져오기
    const validKeys = process.env.API_KEYS?.split(',').map(key => key.trim()) || [];
    if (validKeys.length === 0) {
        console.warn('[WARN] No API keys configured in environment variables');
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'API keys not configured'
        });
    }
    if (!validKeys.includes(apiKey)) {
        const hashedKey = SecurityUtils.hashApiKey(apiKey);
        console.warn(`[WARN] Invalid API key attempt: ${hashedKey}`);
        return res.status(403).json({
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
        });
    }
    // 인증 성공 시 요청 객체에 API 키 정보 추가
    req.apiKey = apiKey;
    req.tenantId = apiKey; // 간단한 테넌트 ID로 사용
    next();
};
/**
 * 선택적 API 키 인증 (헬스체크 등에 사용)
 */
export const optionalApiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        const validKeys = process.env.API_KEYS?.split(',').map(key => key.trim()) || [];
        if (validKeys.includes(apiKey)) {
            req.apiKey = apiKey;
            req.tenantId = apiKey;
        }
    }
    next();
};
