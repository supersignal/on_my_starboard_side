/**
 * 텍스트 전처리 유틸리티
 * 한국어 검색 성능 향상을 위한 텍스트 정규화 및 토큰화
 */

// 한국어 불용어 목록
const KOREAN_STOPWORDS = new Set([
  '이', '가', '을', '를', '은', '는', '에', '에서', '로', '으로', '와', '과',
  '의', '도', '만', '부터', '까지', '한테', '에게', '께', '한테서', '에게서',
  '처럼', '같이', '보다', '마다', '조차', '마저', '까지', '뿐', '밖에',
  '그', '그것', '그녀', '그들', '이것', '저것', '누구', '무엇', '어디', '언제',
  '어떻게', '왜', '몇', '얼마', '어느', '무슨', '어떤', '이런', '저런', '그런',
  '있다', '없다', '하다', '되다', '이다', '아니다', '같다', '다르다',
  '좋다', '나쁘다', '크다', '작다', '많다', '적다', '높다', '낮다',
  '빠르다', '느리다', '쉽다', '어렵다', '새롭다', '오래되다'
]);

// 특수문자 및 숫자 패턴
const SPECIAL_CHARS_REGEX = /[^\w\s가-힣]/g;
const NUMBERS_REGEX = /\d+/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;

export class TextPreprocessor {
  /**
   * 텍스트를 정규화하고 토큰화
   */
  static preprocessText(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // 1. 소문자 변환 및 특수문자 제거
    let normalized = text.toLowerCase()
      .replace(SPECIAL_CHARS_REGEX, ' ')
      .replace(NUMBERS_REGEX, ' ')
      .replace(MULTIPLE_SPACES_REGEX, ' ')
      .trim();

    // 2. 토큰화 (공백 기준)
    const tokens = normalized.split(/\s+/).filter(token => token.length > 0);

    // 3. 불용어 제거
    const filteredTokens = tokens.filter(token => 
      !KOREAN_STOPWORDS.has(token) && 
      token.length > 1 && // 1글자 단어 제거
      !/^[a-z]+$/.test(token) || token.length > 2 // 영어는 2글자 이상만
    );

    // 4. 어간 추출 (간단한 한국어 어간 추출)
    return this.extractStems(filteredTokens);
  }

  /**
   * 간단한 한국어 어간 추출
   * 실제 프로덕션에서는 mecab-ko, konlpy 등을 사용하는 것이 좋음
   */
  private static extractStems(tokens: string[]): string[] {
    return tokens.map(token => {
      // 동사/형용사 어미 제거 (간단한 규칙 기반)
      if (token.length > 2) {
        // ㅏ다, ㅓ다, ㅗ다, ㅜ다, ㅡ다, ㅣ다 패턴
        if (/[가-힣][다]$/.test(token)) {
          return token.slice(0, -1);
        }
        // ㅏ요, ㅓ요, ㅗ요, ㅜ요, ㅡ요, ㅣ요 패턴
        if (/[가-힣][요]$/.test(token)) {
          return token.slice(0, -1);
        }
        // ㅏ서, ㅓ서, ㅗ서, ㅜ서, ㅡ서, ㅣ서 패턴
        if (/[가-힣][서]$/.test(token)) {
          return token.slice(0, -1);
        }
      }
      return token;
    });
  }

  /**
   * 쿼리 텍스트 전처리 (검색어용)
   */
  static preprocessQuery(query: string): string[] {
    const tokens = this.preprocessText(query);
    
    // 쿼리 확장을 위한 동의어 처리
    return this.expandSynonyms(tokens);
  }

  /**
   * 동의어 확장 (간단한 규칙 기반)
   * 실제로는 사전이나 임베딩을 사용하는 것이 좋음
   */
  private static expandSynonyms(tokens: string[]): string[] {
    const synonymMap: Record<string, string[]> = {
      '결제': ['결제', '지불', '페이', 'payment'],
      '카드': ['카드', '신용카드', '체크카드', 'card'],
      '계좌': ['계좌', '은행', 'account', 'bank'],
      '환불': ['환불', '취소', 'refund', 'cancel'],
      'API': ['API', 'api', '에이피아이'],
      '인증': ['인증', '로그인', 'auth', 'authentication'],
      '보안': ['보안', 'security', '암호화'],
      '오류': ['오류', '에러', 'error', '문제'],
      '설정': ['설정', 'config', 'configuration'],
      '테스트': ['테스트', 'test', '검증']
    };

    const expandedTokens = new Set<string>();
    
    for (const token of tokens) {
      expandedTokens.add(token);
      
      // 동의어 추가
      if (synonymMap[token]) {
        synonymMap[token].forEach(synonym => expandedTokens.add(synonym));
      }
    }

    return Array.from(expandedTokens);
  }

  /**
   * N-gram 생성 (부분 일치 검색용)
   */
  static generateNGrams(text: string, n: number = 2): string[] {
    const tokens = this.preprocessText(text);
    const ngrams: string[] = [];
    
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    
    return ngrams;
  }

  /**
   * 텍스트 유사도 계산 (간단한 Jaccard 유사도)
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(this.preprocessText(text1));
    const tokens2 = new Set(this.preprocessText(text2));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }
}
