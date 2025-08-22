import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  data: {
    path: process.env.NICEPAY_DATA_PATH || './src/llm',
    baseUrl: process.env.NICEPAY_BASE_URL || 'https://github.com/supersignal/going_on_hypersonic/blob/main'
  },
  search: {
    bm25: {
      k1: parseFloat(process.env.BM25_K1 || '1.2'),
      b: parseFloat(process.env.BM25_B || '0.75')
    },
    maxResults: parseInt(process.env.MAX_SEARCH_RESULTS || '10')
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

export const GITHUB_CONFIG = {
  baseUrl: process.env.NICEPAY_BASE_URL || 'https://github.com/supersignal/going_on_hypersonic/blob/main',
  markdownPath: '/src/markdown',
  llmPath: '/src/llm'
};