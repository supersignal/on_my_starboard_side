import { GITHUB_CONFIG } from '../config/index.js';
export class NicePaymentsDocument {
    keywordSet;
    remoteMarkdownDocument;
    categories;
    id;
    chunks = [];
    linkPath;
    constructor(keywordSet, remoteMarkdownDocument, categories, id) {
        this.keywordSet = keywordSet;
        this.remoteMarkdownDocument = remoteMarkdownDocument;
        this.categories = categories;
        this.id = id;
        this.linkPath = this.destructureLink(remoteMarkdownDocument.link);
        remoteMarkdownDocument.chunks.forEach((chunk, index) => {
            this.chunks.push({
                id: this.id,
                chunkId: this.id * 1000 + index,
                originTitle: remoteMarkdownDocument.metadata.title,
                text: chunk,
                wordCount: chunk.split(/\s+/).length,
            });
        });
    }
    isCategory(category) {
        return this.categories.includes(category);
    }
    getChunkById(chunkId) {
        return this.chunks.find((chunk) => chunk.chunkId === chunkId);
    }
    getChunkWithWindow(chunkId, windowSize) {
        const chunkIndex = this.chunks.findIndex((chunk) => chunk.chunkId === chunkId);
        if (chunkIndex === -1) {
            return [];
        }
        const start = Math.max(0, chunkIndex - windowSize);
        const end = Math.min(this.chunks.length, chunkIndex + windowSize + 1);
        return this.chunks.slice(start, end);
    }
    getChunks() {
        return this.chunks;
    }
    get content() {
        return this.remoteMarkdownDocument.markdown;
    }
    get title() {
        return this.remoteMarkdownDocument.metadata.title;
    }
    get description() {
        return this.remoteMarkdownDocument.metadata.description;
    }
    toString() {
        return this.remoteMarkdownDocument.markdown;
    }
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            link: this.remoteMarkdownDocument.link,
            description: this.description,
            keywords: Array.from(this.keywordSet),
        };
    }
    destructureLink(link) {
        // .md 확장자 제거
        if (link.endsWith(".md")) {
            link = link.slice(0, link.length - 3);
        }
        // 로컬 파일 경로 처리
        let pathToProcess = link;
        const markdownBase = `${GITHUB_CONFIG.baseUrl}${GITHUB_CONFIG.markdownPath}/`;
        if (link.startsWith(GITHUB_CONFIG.baseUrl + GITHUB_CONFIG.markdownPath)) {
            pathToProcess = link.replace(markdownBase, "");
        }
        // 경로를 분할하여 역순으로 반환
        return pathToProcess
            .split("/")
            .filter((part) => part !== "")
            .reverse();
    }
}
