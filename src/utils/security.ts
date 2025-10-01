import crypto from 'crypto';

/**
 * 보안 유틸리티 클래스
 */
export class SecurityUtils {
  private static readonly SALT_LENGTH = 16;
  private static readonly HASH_ITERATIONS = 10000;

  /**
   * API 키를 안전하게 로깅하기 위한 해시 생성
   */
  static hashApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return 'invalid_key';
    }
    return crypto.createHash('sha256')
      .update(apiKey)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * 민감한 정보 마스킹
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (!data || data.length <= visibleChars) {
      return '*'.repeat(Math.max(data?.length || 0, visibleChars));
    }
    return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
  }

  /**
   * 환경변수 안전 검증
   */
  static validateEnvironmentVariable(key: string, value: string | undefined): string {
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * 안전한 랜덤 문자열 생성
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 입력값 검증 및 정제
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    // 기본적인 XSS 방지
    return input
      .replace(/[<>]/g, '') // HTML 태그 제거
      .replace(/javascript:/gi, '') // JavaScript 프로토콜 제거
      .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
      .trim()
      .substring(0, 1000); // 길이 제한
  }

  /**
   * SQL 인젝션 방지를 위한 입력값 검증
   */
  static validateSearchQuery(query: string): boolean {
    if (!query || typeof query !== 'string') {
      return false;
    }

    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/)/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(query));
  }

  /**
   * 요청 빈도 제한을 위한 키 생성
   */
  static generateRateLimitKey(identifier: string, endpoint: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${identifier}:${endpoint}`);
    return hash.digest('hex').substring(0, 16);
  }
}

