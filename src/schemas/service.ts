import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NicePaymentDocsRepository } from "../repository/nicepayments-docs.repository.js";
import { CONFIG } from '../config/index.js';
import { Logger } from '../utils/logger.js';

export const repository = await NicePaymentDocsRepository.load();

export async function getDocumentsByKeyword(
  keywords: string[]
): Promise<CallToolResult> {
  // [디버그] 입력된 키워드 출력
//  console.log('[DEBUG][service] 입력 키워드:', keywords);
  try {
    const text = await repository.findDocumentsByKeyword(keywords);
    // [디버그] 검색 결과 텍스트 출력
//    console.log('[DEBUG][service] 검색 결과 텍스트:', text);
  // 로깅 레벨에 따른 출력 제어
    const logger = Logger.getInstance();
    if (CONFIG.server.logLevel === 'debug') {
      logger.debug('[service] 입력 키워드:', keywords);
      logger.debug('[service] 검색 결과 텍스트:', text);
    }
    return {
      content: [{ type: "text", text }],
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    
    const logger = Logger.getInstance();
    if (CONFIG.server.logLevel === 'debug') {
      logger.error('[service] 에러 발생:', e);
    }
    
    return {
      content: [{ type: "text", text: errorMessage }],
      isError: true,
    };
  }
}
