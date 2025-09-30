import dotenv from 'dotenv';
dotenv.config();
export const CONFIG = {
    data: {
        path: process.env.NICEPAY_DATA_PATH || 'https://github.com/supersignal/going_on_hypersonic/blob/main/src/llm/llms.txt',
        baseUrl: process.env.NICEPAY_BASE_URL || 'https://github.com/supersignal/going_on_hypersonic/blob/main'
    },
    search: {
        bm25: {
            k1: parseFloat(process.env.BM25_K1 || '1.2'),
            b: parseFloat(process.env.BM25_B || '0.75'),
            k3: parseFloat(process.env.BM25_K3 || '1.2'),
            alpha: parseFloat(process.env.BM25_ALPHA || '2.0'), // 제목 가중치
            beta: parseFloat(process.env.BM25_BETA || '1.5') // 설명 가중치
        },
        hybrid: {
            bm25Weight: parseFloat(process.env.HYBRID_BM25_WEIGHT || '0.6'),
            embeddingWeight: parseFloat(process.env.HYBRID_EMBEDDING_WEIGHT || '0.4'),
            useQueryExpansion: process.env.USE_QUERY_EXPANSION === 'true',
            minScore: parseFloat(process.env.MIN_SEARCH_SCORE || '0.1')
        },
        textProcessing: {
            removeStopwords: process.env.REMOVE_STOPWORDS !== 'false',
            extractStems: process.env.EXTRACT_STEMS !== 'false',
            minTokenLength: parseInt(process.env.MIN_TOKEN_LENGTH || '2'),
            maxNGramSize: parseInt(process.env.MAX_NGRAM_SIZE || '3')
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
    markdownPath: process.env.NICEPAY_MARKDOWN_PATH || '/src/markdown',
    llmPath: process.env.NICEPAY_LLM_PATH || '/src/llm'
};
