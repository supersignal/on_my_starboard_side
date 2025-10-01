import { z } from "zod";
// 결제 요청 스키마 (MCP 호환 형식)
export const PaymentRequestSchema = {
    orderId: z.string().describe("주문번호 (가맹점에서 생성하는 고유 주문번호)"),
    amount: z.number().describe("결제금액 (원)"),
    goodsName: z.string().describe("상품명"),
    buyerName: z.string().describe("구매자명"),
    buyerEmail: z.string().email().describe("구매자 이메일"),
    buyerTel: z.string().describe("구매자 전화번호"),
    returnUrl: z.string().url().describe("결제 완료 후 리턴 URL"),
    notifyUrl: z.string().url().describe("결제 결과 통보 URL"),
    testMode: z.boolean().default(true).describe("테스트 모드 여부")
};
// 취소 요청 스키마 (MCP 호환 형식)
export const CancelRequestSchema = {
    orderId: z.string().describe("취소할 주문번호"),
    amount: z.number().describe("취소금액 (원)"),
    reason: z.string().describe("취소사유"),
    testMode: z.boolean().default(true).describe("테스트 모드 여부")
};
// 결제 상태 조회 스키마 (MCP 호환 형식)
export const PaymentStatusSchema = {
    orderId: z.string().describe("조회할 주문번호"),
    testMode: z.boolean().default(true).describe("테스트 모드 여부")
};
// Zod 스키마 객체들 (HTTP API용)
export const PaymentRequestZodSchema = z.object(PaymentRequestSchema);
export const CancelRequestZodSchema = z.object(CancelRequestSchema);
export const PaymentStatusZodSchema = z.object(PaymentStatusSchema);
// 테스트용 결제 서비스 클래스
export class PaymentTestService {
    testPayments = new Map();
    testCancels = new Map();
    // 결제 요청 처리 (테스트용)
    async processPayment(request) {
        const { orderId, amount, goodsName, buyerName, testMode } = request;
        // 테스트 모드가 아닌 경우 에러
        if (!testMode) {
            return {
                success: false,
                orderId,
                amount,
                status: 'FAILED',
                message: '실제 결제는 지원하지 않습니다. 테스트 모드로만 사용 가능합니다.',
                errorCode: 'TEST_MODE_ONLY',
                timestamp: new Date().toISOString()
            };
        }
        // 중복 주문번호 체크
        if (this.testPayments.has(orderId)) {
            return {
                success: false,
                orderId,
                amount,
                status: 'FAILED',
                message: '이미 존재하는 주문번호입니다.',
                errorCode: 'DUPLICATE_ORDER',
                timestamp: new Date().toISOString()
            };
        }
        // 테스트 결제 성공 시뮬레이션 (90% 성공률)
        const isSuccess = Math.random() > 0.1;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const response = {
            success: isSuccess,
            orderId,
            transactionId: isSuccess ? transactionId : undefined,
            amount,
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            message: isSuccess
                ? `테스트 결제가 성공적으로 처리되었습니다. 상품: ${goodsName}, 구매자: ${buyerName}`
                : '테스트 결제 처리 중 오류가 발생했습니다.',
            paymentUrl: isSuccess ? `https://test-payment.nicepay.co.kr/payment/${transactionId}` : undefined,
            errorCode: isSuccess ? undefined : 'PAYMENT_FAILED',
            timestamp: new Date().toISOString()
        };
        if (isSuccess) {
            this.testPayments.set(orderId, response);
        }
        return response;
    }
    // 결제 취소 처리 (테스트용)
    async processCancel(request) {
        const { orderId, amount, reason, testMode } = request;
        // 테스트 모드가 아닌 경우 에러
        if (!testMode) {
            return {
                success: false,
                orderId,
                amount,
                status: 'FAILED',
                message: '실제 취소는 지원하지 않습니다. 테스트 모드로만 사용 가능합니다.',
                errorCode: 'TEST_MODE_ONLY',
                timestamp: new Date().toISOString()
            };
        }
        // 원본 결제 내역 확인
        const originalPayment = this.testPayments.get(orderId);
        if (!originalPayment) {
            return {
                success: false,
                orderId,
                amount,
                status: 'FAILED',
                message: '취소할 결제 내역을 찾을 수 없습니다.',
                errorCode: 'PAYMENT_NOT_FOUND',
                timestamp: new Date().toISOString()
            };
        }
        // 이미 취소된 결제인지 확인
        if (originalPayment.status === 'CANCELLED') {
            return {
                success: false,
                orderId,
                amount,
                status: 'FAILED',
                message: '이미 취소된 결제입니다.',
                errorCode: 'ALREADY_CANCELLED',
                timestamp: new Date().toISOString()
            };
        }
        // 취소 금액 검증
        if (amount > originalPayment.amount) {
            return {
                success: false,
                orderId,
                amount,
                status: 'FAILED',
                message: '취소 금액이 결제 금액을 초과할 수 없습니다.',
                errorCode: 'INVALID_CANCEL_AMOUNT',
                timestamp: new Date().toISOString()
            };
        }
        // 테스트 취소 성공 시뮬레이션 (95% 성공률)
        const isSuccess = Math.random() > 0.05;
        const response = {
            success: isSuccess,
            orderId,
            transactionId: originalPayment.transactionId,
            amount,
            status: isSuccess ? 'CANCELLED' : 'FAILED',
            message: isSuccess
                ? `테스트 취소가 성공적으로 처리되었습니다. 사유: ${reason}`
                : '테스트 취소 처리 중 오류가 발생했습니다.',
            errorCode: isSuccess ? undefined : 'CANCEL_FAILED',
            timestamp: new Date().toISOString()
        };
        if (isSuccess) {
            // 원본 결제 상태를 취소로 변경
            originalPayment.status = 'CANCELLED';
            this.testPayments.set(orderId, originalPayment);
            this.testCancels.set(orderId, response);
        }
        return response;
    }
    // 결제 상태 조회 (테스트용)
    async getPaymentStatus(request) {
        const { orderId, testMode } = request;
        // 테스트 모드가 아닌 경우 에러
        if (!testMode) {
            return {
                success: false,
                orderId,
                amount: 0,
                status: 'FAILED',
                message: '실제 조회는 지원하지 않습니다. 테스트 모드로만 사용 가능합니다.',
                errorCode: 'TEST_MODE_ONLY',
                timestamp: new Date().toISOString()
            };
        }
        const payment = this.testPayments.get(orderId);
        if (!payment) {
            return {
                success: false,
                orderId,
                amount: 0,
                status: 'FAILED',
                message: '해당 주문번호의 결제 내역을 찾을 수 없습니다.',
                errorCode: 'PAYMENT_NOT_FOUND',
                timestamp: new Date().toISOString()
            };
        }
        return {
            success: true,
            orderId: payment.orderId,
            transactionId: payment.transactionId,
            amount: payment.amount,
            status: payment.status,
            paymentMethod: 'TEST_CARD',
            paidAt: payment.status === 'SUCCESS' ? payment.timestamp : undefined,
            message: '결제 상태 조회가 완료되었습니다.',
            timestamp: new Date().toISOString()
        };
    }
    // 테스트 데이터 초기화
    clearTestData() {
        this.testPayments.clear();
        this.testCancels.clear();
    }
    // 테스트 데이터 조회
    getAllTestPayments() {
        return Array.from(this.testPayments.values());
    }
    getAllTestCancels() {
        return Array.from(this.testCancels.values());
    }
}
// 싱글톤 인스턴스
export const paymentTestService = new PaymentTestService();
