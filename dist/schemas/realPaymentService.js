import { z } from "zod";
import crypto from 'crypto';
// 실제 결제 요청 스키마
export const RealPaymentRequestSchema = {
    orderId: z.string().describe("주문번호 (가맹점에서 생성하는 고유 주문번호)"),
    amount: z.number().describe("결제금액 (원)"),
    goodsName: z.string().describe("상품명"),
    buyerName: z.string().describe("구매자명"),
    buyerEmail: z.string().email().describe("구매자 이메일"),
    buyerTel: z.string().describe("구매자 전화번호"),
    returnUrl: z.string().url().describe("결제 완료 후 리턴 URL"),
    notifyUrl: z.string().url().describe("결제 결과 통보 URL"),
    paymentMethod: z.enum(['CARD', 'BANK', 'VBANK', 'CELLPHONE']).describe("결제수단"),
    useEscrow: z.boolean().optional().default(false).describe("에스크로 사용 여부"),
    testMode: z.boolean().default(false).describe("테스트 모드 여부")
};
// 실제 취소 요청 스키마
export const RealCancelRequestSchema = {
    orderId: z.string().describe("취소할 주문번호"),
    amount: z.number().describe("취소금액 (원)"),
    reason: z.string().describe("취소사유"),
    testMode: z.boolean().default(false).describe("테스트 모드 여부")
};
// 실제 결제 상태 조회 스키마
export const RealPaymentStatusSchema = {
    orderId: z.string().describe("조회할 주문번호"),
    testMode: z.boolean().default(false).describe("테스트 모드 여부")
};
// Zod 스키마 객체들
export const RealPaymentRequestZodSchema = z.object(RealPaymentRequestSchema);
export const RealCancelRequestZodSchema = z.object(RealCancelRequestSchema);
export const RealPaymentStatusZodSchema = z.object(RealPaymentStatusSchema);
// 나이스페이먼츠 실제 결제 서비스 클래스
export class RealPaymentService {
    config;
    constructor(config) {
        this.config = config;
    }
    // 나이스페이먼츠 API 서명 생성
    generateSignature(data) {
        const sortedKeys = Object.keys(data).sort();
        const queryString = sortedKeys
            .map(key => `${key}=${data[key]}`)
            .join('&');
        return crypto
            .createHmac('sha256', this.config.merchantKey)
            .update(queryString)
            .digest('hex');
    }
    // 나이스페이먼츠 API 호출
    async callNicePayAPI(endpoint, data) {
        const url = `${this.config.baseUrl}${endpoint}`;
        // 서명 추가
        data.signature = this.generateSignature(data);
        data.merchantId = this.config.merchantId;
        data.timestamp = Date.now().toString();
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`API 호출 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }
    // 실제 결제 요청 처리
    async processPayment(request) {
        const { orderId, amount, goodsName, buyerName, buyerEmail, buyerTel, returnUrl, notifyUrl, paymentMethod, useEscrow, testMode } = request;
        // 테스트 모드가 아닌 경우에만 실제 API 호출
        if (!testMode) {
            try {
                const paymentData = {
                    orderId,
                    amount,
                    goodsName,
                    buyerName,
                    buyerEmail,
                    buyerTel,
                    returnUrl,
                    notifyUrl,
                    paymentMethod,
                    useEscrow: useEscrow || false,
                    currency: 'KRW',
                    language: 'ko'
                };
                const response = await this.callNicePayAPI('/api/payment', paymentData);
                return {
                    success: response.resultCode === '0000',
                    orderId,
                    transactionId: response.transactionId,
                    amount,
                    status: response.resultCode === '0000' ? 'SUCCESS' : 'FAILED',
                    message: response.resultMsg || '결제 처리 완료',
                    paymentUrl: response.paymentUrl,
                    errorCode: response.resultCode !== '0000' ? response.resultCode : undefined,
                    timestamp: new Date().toISOString(),
                    rawResponse: response
                };
            }
            catch (error) {
                return {
                    success: false,
                    orderId,
                    amount,
                    status: 'FAILED',
                    message: error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.',
                    errorCode: 'PAYMENT_ERROR',
                    timestamp: new Date().toISOString()
                };
            }
        }
        else {
            // 테스트 모드인 경우 에러 반환
            return {
                success: false,
                orderId,
                amount,
                status: 'FAILED',
                message: '실제 결제는 테스트 모드를 비활성화해야 합니다.',
                errorCode: 'TEST_MODE_ACTIVE',
                timestamp: new Date().toISOString()
            };
        }
    }
    // 실제 결제 취소 처리
    async processCancel(request) {
        const { orderId, amount, reason, testMode } = request;
        if (!testMode) {
            try {
                const cancelData = {
                    orderId,
                    amount,
                    reason,
                    currency: 'KRW'
                };
                const response = await this.callNicePayAPI('/api/cancel', cancelData);
                return {
                    success: response.resultCode === '0000',
                    orderId,
                    transactionId: response.transactionId,
                    amount,
                    status: response.resultCode === '0000' ? 'CANCELLED' : 'FAILED',
                    message: response.resultMsg || '취소 처리 완료',
                    errorCode: response.resultCode !== '0000' ? response.resultCode : undefined,
                    timestamp: new Date().toISOString(),
                    rawResponse: response
                };
            }
            catch (error) {
                return {
                    success: false,
                    orderId,
                    amount,
                    status: 'FAILED',
                    message: error instanceof Error ? error.message : '취소 처리 중 오류가 발생했습니다.',
                    errorCode: 'CANCEL_ERROR',
                    timestamp: new Date().toISOString()
                };
            }
        }
        else {
            return {
                success: false,
                orderId,
                amount,
                status: 'FAILED',
                message: '실제 취소는 테스트 모드를 비활성화해야 합니다.',
                errorCode: 'TEST_MODE_ACTIVE',
                timestamp: new Date().toISOString()
            };
        }
    }
    // 실제 결제 상태 조회
    async getPaymentStatus(request) {
        const { orderId, testMode } = request;
        if (!testMode) {
            try {
                const statusData = {
                    orderId
                };
                const response = await this.callNicePayAPI('/api/status', statusData);
                return {
                    success: response.resultCode === '0000',
                    orderId,
                    transactionId: response.transactionId,
                    amount: response.amount,
                    status: response.status,
                    paymentMethod: response.paymentMethod,
                    paidAt: response.paidAt,
                    message: response.resultMsg || '상태 조회 완료',
                    errorCode: response.resultCode !== '0000' ? response.resultCode : undefined,
                    timestamp: new Date().toISOString(),
                    rawResponse: response
                };
            }
            catch (error) {
                return {
                    success: false,
                    orderId,
                    amount: 0,
                    status: 'FAILED',
                    message: error instanceof Error ? error.message : '상태 조회 중 오류가 발생했습니다.',
                    errorCode: 'STATUS_ERROR',
                    timestamp: new Date().toISOString()
                };
            }
        }
        else {
            return {
                success: false,
                orderId,
                amount: 0,
                status: 'FAILED',
                message: '실제 상태 조회는 테스트 모드를 비활성화해야 합니다.',
                errorCode: 'TEST_MODE_ACTIVE',
                timestamp: new Date().toISOString()
            };
        }
    }
    // 설정 업데이트
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    // 현재 설정 조회
    getConfig() {
        return { ...this.config };
    }
}
// 환경변수에서 설정을 로드하는 함수
export function createRealPaymentService() {
    const config = {
        merchantId: process.env.NICEPAY_MERCHANT_ID || '',
        merchantKey: process.env.NICEPAY_MERCHANT_KEY || '',
        baseUrl: process.env.NICEPAY_BASE_URL || 'https://api.nicepay.co.kr',
        isTestMode: process.env.NICEPAY_TEST_MODE === 'true'
    };
    if (!config.merchantId || !config.merchantKey) {
        throw new Error('나이스페이먼츠 설정이 올바르지 않습니다. NICEPAY_MERCHANT_ID와 NICEPAY_MERCHANT_KEY를 설정해주세요.');
    }
    return new RealPaymentService(config);
}
