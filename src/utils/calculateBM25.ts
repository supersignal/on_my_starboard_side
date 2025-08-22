import { NicePaymentsDocument } from "../document/nicepayments-document.js";
import { DocumentChunk } from "../document/document-chunk.js";
import { CONFIG } from '../config/index.js';

export function calculateBM25ScoresByKeywords(
  keywords: string,
  documents: NicePaymentsDocument[],
  k1: number = CONFIG.search.bm25.k1,
  b: number = CONFIG.search.bm25.b
): BM25Result[] {
  const allChunks = documents.flatMap((doc) => doc.getChunks());
  const totalCount = allChunks.reduce((count, doc) => count + doc.wordCount, 0);
  const avgDocLength = totalCount / allChunks.length;

  const { termFrequencies, docFrequencies } = calculateFrequencies(
    keywords,
    allChunks
  );

  // BM25 scores
  const results: BM25Score[] = [];

  const N = allChunks.length;

  for (const chunk of allChunks) {
    if (!termFrequencies[chunk.chunkId]) continue;

    const tf = termFrequencies[chunk.chunkId];
    const len = chunk.wordCount;

    let score = 0;

    for (const term in tf) {
      const f = tf[term];
      const df = docFrequencies[term];
      const idf = Math.log((N - df + 0.5) / (df + 0.5));
      const numerator = f * (k1 + 1);
      const denominator = f + k1 * (1 - b + b * (len / avgDocLength));
      score += idf * (numerator / denominator);
    }

    const totalTF = Object.values(tf).reduce((sum, v) => sum + v, 0);

    results.push({
      id: chunk.id,
      chunkId: chunk.chunkId,
      score,
      totalTF,
    });
  }

  results.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : b.totalTF - a.totalTF
  );

  return results.map(({ id, score, chunkId }) => ({ id, chunkId, score }));
}

function calculateFrequencies(query: string, documents: DocumentChunk[]) {
  const pattern = toPattern(query);

  const termFrequencies: Record<number, Record<string, number>> = {};
  const docFrequencies: Record<string, number> = {};

  for (const doc of documents) {
    const text = doc.text;

    const matches = Array.from(text.matchAll(pattern));
    const termCounts: Record<string, number> = {};

    for (const match of matches) {
      const term = match[0].toLowerCase();
      termCounts[term] = (termCounts[term] || 0) + 1;
    }

    if (Object.keys(termCounts).length > 0) {
      termFrequencies[doc.chunkId] = termCounts;
      for (const term of Object.keys(termCounts)) {
        docFrequencies[term] = (docFrequencies[term] || 0) + 1;
      }
    }
  }
  return { termFrequencies, docFrequencies };
}

function toPattern(query: string) {
  try {
    return new RegExp(query, "gi");
  } catch {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, "gi");
  }
}

type BM25Score = {
  id: number;
  chunkId: number;
  score: number;
  totalTF: number;
};

export interface BM25Result {
  id: number;
  chunkId: number; // Optional, used for document chunks
  score: number;
}

