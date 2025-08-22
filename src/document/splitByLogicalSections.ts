import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";
import { DocumentMetadata } from "./document-metadata.js";

export function splitByLogicalSections(markdown: string): MarkdownDocument {
  const metadata = extractMetadata(markdown);

  if (metadata.title !== "No Title") {
    markdown = markdown.substring(markdown.indexOf("-----"));
  }

  const tree = unified().use(remarkParse).parse(markdown);

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  const urls = new Set<string>();

  visit(tree, (node) => {
    if (node.type === "heading" && node.depth <= 2) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join("\n").trim());
        currentChunk = [];
      }
    }

    if (node.type === "inlineCode") {
      currentChunk.push(`\`${node.value}\``);
    } else if (node.type === "code") {
      currentChunk.push(`\`\`\`${node.lang || ""}\n${node.value}\n\`\`\``);
    } else if (
      node.type === "link" &&
      node.children.length > 0 &&
      "value" in node.children[0]
    ) {
      currentChunk.push(`[${node.children[0].value}](${node.url})`);
      urls.add(node.url);
    } else if ("value" in node && typeof node.value === "string") {
      currentChunk.push(node.value);
    }
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n").trim());
  }

  return { markdown, chunks: joinShortChunks(chunks), urls, metadata };
}

export interface MarkdownDocument {
  markdown: string;
  chunks: string[];
  urls: Set<string>;
  metadata: DocumentMetadata;
}

function extractMetadata(markdown: string): DocumentMetadata {
  const startIndex = markdown.indexOf("***");
  const endIndex = markdown.indexOf("-----", startIndex + 3);

  if (startIndex === -1 || endIndex === -1) {
    return { title: "No Title", description: "No Description", keyword: [] };
  }

  const metadata = markdown.substring(startIndex + 3, endIndex).trim();

  const [rawTitle, rawDescription, rawKeyword] = metadata
    .split("\n")
    .map((line) => line.trim());

  const titleMatch = rawTitle?.match(/title:\s*(.*)/);
  const descriptionMatch = rawDescription?.match(/description:\s*(.*)/);
  const keywordMatch = rawKeyword?.match(/keyword:\s*(.*)/);

  return {
    title: titleMatch ? titleMatch[1].trim() : "No Title",
    description: descriptionMatch
      ? descriptionMatch[1].trim()
      : "No Description",
    keyword: keywordMatch
      ? keywordMatch[1].split(",").map((k) => k.trim())
      : [],
  };
}

function joinShortChunks(chunks: string[], minWords = 30): string[] {
  const result: string[] = [];

  let buffer = "";
  let bufferCount = 0;

  for (const chunk of chunks) {
    const wc = chunk.split(/\s+/).length;
    if (wc < minWords) {
      buffer += (buffer ? "\n\n" : "") + chunk;
      bufferCount += wc;
      continue;
    }

    if (buffer) {
      result.push(buffer.trim());
      buffer = "";
      bufferCount = 0;
    }

    result.push(chunk.trim());
  }

  if (buffer) {
    result.push(buffer.trim());
  }

  return result;
}

