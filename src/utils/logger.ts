import { CONFIG } from '../config/index.js';

export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
  }
  
  export class Logger {
    private static instance: Logger;
    private level: LogLevel;
  
    static getInstance(): Logger {
      if (!Logger.instance) {
        Logger.instance = new Logger();
      }
      return Logger.instance;
    }

    private constructor() {
      this.level = this.parseLogLevel(CONFIG.server.logLevel);
    }

    private parseLogLevel(level: string): LogLevel {
      switch (level.toLowerCase()) {
        case 'error': return LogLevel.ERROR;
        case 'warn': return LogLevel.WARN;
        case 'info': return LogLevel.INFO;
        case 'debug': return LogLevel.DEBUG;
        default: return LogLevel.INFO;
      }
    }
  
    private shouldLog(level: LogLevel): boolean {
      return level <= this.level;
    }
  
    error(message: string, data?: any) {
      if (this.shouldLog(LogLevel.ERROR)) {
        console.error(`[ERROR] ${message}`, data || '');
      }
    }
  
    warn(message: string, data?: any) {
      if (this.shouldLog(LogLevel.WARN)) {
        console.warn(`[WARN] ${message}`, data || '');
      }
    }
  
    info(message: string, data?: any) {
      if (this.shouldLog(LogLevel.INFO)) {
        console.log(`[INFO] ${message}`, data || '');
      }
    }
  
    debug(message: string, data?: any) {
      if (this.shouldLog(LogLevel.DEBUG)) {
        console.log(`[DEBUG] ${message}`, data || '');
      }
    }
  }