import { NicePaymentsDocument } from "./nicepayments-document.js";
import { toRemoteMarkdownLink } from "../utils/toRemoteMarkdownLink.js";
import { categories } from "../constants/category.js";
export class NicePaymentsDocumentLoader {
    rawDocs;
    documentFetcher;
    documentId = 0;
    links = [];
    invokedLinks = new Set();
    nicePaymentsDocuments = new Map();
    constructor(rawDocs, documentFetcher) {
        this.rawDocs = rawDocs;
        this.documentFetcher = documentFetcher;
        this.rawDocs.forEach((doc) => {
            if (doc.link) {
                this.links.push(doc.link);
            }
        });
    }
    async load() {
        await this.collect(new Set(this.links));
    }
    getDocuments() {
        return Array.from(this.nicePaymentsDocuments.values());
    }
    async collect(links) {
        const nextLinks = await Promise.all(Array.from(links.values()).map(async (link) => {
            try {
                if (this.invokedLinks.has(link)) {
                    return [];
                }
                const document = await this.documentFetcher.fetch(link);
                const foundCategories = categories.filter((keyword) => link.includes(keyword));
                const keywordSet = new Set();
                document.metadata.keyword.forEach((keyword) => {
                    keywordSet.add(keyword.toLowerCase());
                    keywordSet.add(keyword.toUpperCase());
                    keywordSet.add(keyword);
                });
                const nicePaymentDocument = new NicePaymentsDocument(keywordSet, document, foundCategories, this.documentId++);
                this.nicePaymentsDocuments.set(link, nicePaymentDocument);
                return Array.from(document.urls.values())
                    .map(toRemoteMarkdownLink)
                    .filter((link) => typeof link === "string")
                    .filter((url) => !this.invokedLinks.has(url));
            }
            catch (error) {
                console.error(`Failed to fetch document from ${link}:`, error);
            }
            finally {
                this.invokedLinks.add(link);
            }
            return [];
        }));
        return new Set(nextLinks.flat());
    }
}
