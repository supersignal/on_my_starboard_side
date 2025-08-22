declare global {
    namespace NodeJS {
      interface ProcessEnv {
        NICEPAY_DATA_PATH?: string;
        NICEPAY_BASE_URL?: string;
        BM25_K1?: string;
        BM25_B?: string;
        LOG_LEVEL?: 'debug' | 'info' | 'error';
        MAX_SEARCH_RESULTS?: string;
        PORT?: string;
        NODE_ENV?: 'development' | 'production';
      }
    }
  }
  
  export {};