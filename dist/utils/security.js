import crypto from 'crypto';
/**
 * 보안 유틸리티 클래스
 */
export class SecurityUtils {
    /**
     * API 키를 안전하게 로깅하기 위한 해시 생성
     */
    static hashApiKey(apiKey) {
        return crypto.createHash('sha256')
            .update(apiKey)
            .digest('hex')
            .substring(0, 8);
    }
    /**
     * 민감한 정보 마스킹
     */
    static maskSensitiveData(data, visibleChars = 4) {
        if (data.length <= visibleChars) {
            return '*'.repeat(data.length);
        }
        return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
    }
    /**
     * 환경변수 안전 검증
     */
    static validateEnvironmentVariable(key, value) {
        if (!value) {
            throw new Error(`Required environment variable ${key} is not set`);
        }
        return value;
    }
}
