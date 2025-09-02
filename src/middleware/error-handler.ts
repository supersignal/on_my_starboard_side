import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * 커스텀 에러 클래스
 */
export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 에러 로깅 함수
 */
const logError = (error: AppError, req: AuthenticatedRequest) => {
  const apiKey = req.apiKey ? req.apiKey.substring(0, 8) + '...' : 'anonymous';
  const endpoint = `${req.method} ${req.path}`;
  
  console.error(`[ERROR] ${error.statusCode || 500} - ${endpoint} - API Key: ${apiKey}`);
  console.error(`[ERROR] Message: ${error.message}`);
  
  if (error.stack && process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] Stack: ${error.stack}`);
  }
};

/**
 * 에러 응답 포맷터
 */
const formatErrorResponse = (error: AppError, req: Request) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response: any = {
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // 개발 환경에서만 스택 트레이스 포함
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  // 요청 ID가 있으면 포함
  if (req.headers['x-request-id']) {
    response.requestId = req.headers['x-request-id'];
  }

  return response;
};

/**
 * 글로벌 에러 핸들러 미들웨어
 */
export const errorHandler = (
  error: AppError,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // 에러 로깅
  logError(error, req);

  // 기본 상태 코드 설정
  const statusCode = error.statusCode || 500;
  
  // 응답 포맷팅
  const errorResponse = formatErrorResponse(error, req);

  // 응답 전송
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 에러 핸들러
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new CustomError(`Route ${req.method} ${req.path} not found`, 404);
  
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

/**
 * 비동기 에러 래퍼
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 요청 ID 미들웨어
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};
