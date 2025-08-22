import {
  MarkdownDocument,
  splitByLogicalSections,
} from "./splitByLogicalSections.js";
import { BasicHttpHeaders } from "../constants/basic-http-headers.js";

export class MarkdownDocumentFetcher {
  async fetch(link: string): Promise<RemoteMarkdownDocument> {
    let resourceText: string;
    
    // 로컬 파일 경로인지 확인 (절대 경로로 시작하는 경우)
    if (link.startsWith('/') || link.startsWith('file://')) {
      // 로컬 파일 읽기
      const fs = await import('fs/promises');
      const filePath = link.startsWith('file://') ? link.replace('file://', '') : link;
      
      try {
        resourceText = await fs.readFile(filePath, 'utf-8');
        console.log(`[DEBUG] 로컬 파일 읽기 성공: ${filePath}`);
      } catch (error) {
        console.error(`[DEBUG] 로컬 파일 읽기 실패: ${filePath}`, error);
        throw new Error(`Failed to read local file: ${filePath} - ${error}`);
      }
    } else {
      // HTTP/HTTPS URL인 경우 fetch 사용
      const response = await fetch(link, { headers: BasicHttpHeaders });

      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.statusText}`);
      }

      resourceText = await response.text();
    }

    return {
      ...splitByLogicalSections(resourceText),
      link,
    };
  }
}

export interface RemoteMarkdownDocument extends MarkdownDocument {
  link: string;
}

