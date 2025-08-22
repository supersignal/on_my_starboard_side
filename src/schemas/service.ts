import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NicePaymentDocsRepository } from "../repository/nicepayments-docs.repository.js";
import { CONFIG } from '../config/index.js';

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
    if (CONFIG.server.logLevel === 'debug') {
      console.log('[DEBUG][service] 입력 키워드:', keywords);
      console.log('[DEBUG][service] 검색 결과 텍스트:', text);
    }
    return {
      content: [{ type: "text", text }],
    };
  } catch (e) {
    // [디버그] 에러 발생 시 에러 메시지 출력
//    console.log('[DEBUG][service] 에러 발생:', e);
    if (e instanceof Error) {
      console.error('[ERROR][service] 에러 발생:', e.message, e.stack);
    } else {
      console.error('[ERROR][service] 알 수 없는 에러:', e);
    }
    return {
      content: [
        {
          type: "text",
          text: e instanceof Error ? e.message : "오류가 발생하였습니다.",
        },
      ],
      isError: true,
    };
  }
}

