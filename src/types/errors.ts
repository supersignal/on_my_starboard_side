/**
 * 애플리케이션 에러 타입 정의
 */

export enum ErrorCode {
  // 검색 관련 에러
  SEARCH_FAILED = 'SEARCH_FAILED',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  INVALID_SEARCH_QUERY = 'INVALID_SEARCH_QUERY',
  
  // 인증 관련 에러
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  MISSING_API_KEY = 'MISSING_API_KEY',
  
  // 결제 관련 에러
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  INVALID_PAYMENT_DATA = 'INVALID_PAYMENT_DATA',
  
  // 시스템 에러
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  requestId?: string;
}

export class SearchError extends Error implements AppError {
  public code: ErrorCode;
  public details?: Record<string, unknown>;
  public timestamp: Date;
  public requestId?: string;

  constructor(message: string, details?: Record<string, unknown>, requestId?: string) {
    super(message);
    this.code = ErrorCode.SEARCH_FAILED;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.name = 'SearchError';
  }
}

export class PaymentError extends Error implements AppError {
  public code: ErrorCode;
  public details?: Record<string, unknown>;
  public timestamp: Date;
  public requestId?: string;

  constructor(message: string, code: ErrorCode, details?: Record<string, unknown>, requestId?: string) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.name = 'PaymentError';
  }
}

export class ConfigurationError extends Error implements AppError {
  public code: ErrorCode;
  public details?: Record<string, unknown>;
  public timestamp: Date;
  public requestId?: string;

  constructor(message: string, details?: Record<string, unknown>, requestId?: string) {
    super(message);
    this.code = ErrorCode.CONFIGURATION_ERROR;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.name = 'ConfigurationError';
  }
}

