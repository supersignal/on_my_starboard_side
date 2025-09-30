import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { validateEnv } from './config/validation.js';
import { getDocumentsByKeyword, repository } from './schemas/service.js';

// ✅ GitHub Service
import { GithubService } from "./schemas/githubService.js";

const env = validateEnv();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// 헬스체크
app.get('/health', (_req, res) => {
    res.json({ ok: true, env: { node: process.version, port: PORT } });
});

// 문서 검색
app.post('/mcp/get_documents', async (req, res) => {
    const schema = z.object({ keywords: z.array(z.string()).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ isError: true, error: parsed.error.flatten() });
    }
    try {
        const result = await getDocumentsByKeyword(parsed.data.keywords);
        res.json(result);
    } catch (e) {
        res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
});

// 문서 상세
app.get('/mcp/document-details/:id', async (req, res) => {
    const idStr = req.params.id;
    const idNum = Number(idStr);
    if (!Number.isFinite(idNum)) {
        return res.status(400).json({ isError: true, error: 'invalid id' });
    }
    try {
        const doc = repository.findOneById(idNum);
        if (!doc) return res.status(404).json({ isError: true, error: 'not found' });
        res.json({ content: [{ type: 'text', text: doc.content }] });
    } catch (e) {
        res.status(500).json({ isError: true, error: e instanceof Error ? e.message : 'unknown error' });
    }
});

app.listen(PORT, () => {
    console.log(`HTTP server listening on http://0.0.0.0:${PORT}`);
});
