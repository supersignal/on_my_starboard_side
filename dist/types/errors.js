/**
 * 애플리케이션 에러 타입 정의
 */
export var ErrorCode;
(function (ErrorCode) {
    // 검색 관련 에러
    ErrorCode["SEARCH_FAILED"] = "SEARCH_FAILED";
    ErrorCode["DOCUMENT_NOT_FOUND"] = "DOCUMENT_NOT_FOUND";
    ErrorCode["INVALID_SEARCH_QUERY"] = "INVALID_SEARCH_QUERY";
    // 인증 관련 에러
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["INVALID_API_KEY"] = "INVALID_API_KEY";
    ErrorCode["MISSING_API_KEY"] = "MISSING_API_KEY";
    // 결제 관련 에러
    ErrorCode["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    ErrorCode["PAYMENT_CANCELLED"] = "PAYMENT_CANCELLED";
    ErrorCode["INVALID_PAYMENT_DATA"] = "INVALID_PAYMENT_DATA";
    // 시스템 에러
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
})(ErrorCode || (ErrorCode = {}));
export class SearchError extends Error {
    code;
    details;
    timestamp;
    requestId;
    constructor(message, details, requestId) {
        super(message);
        this.code = ErrorCode.SEARCH_FAILED;
        this.details = details;
        this.timestamp = new Date();
        this.requestId = requestId;
        this.name = 'SearchError';
    }
}
export class PaymentError extends Error {
    code;
    details;
    timestamp;
    requestId;
    constructor(message, code, details, requestId) {
        super(message);
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
        this.requestId = requestId;
        this.name = 'PaymentError';
    }
}
export class ConfigurationError extends Error {
    code;
    details;
    timestamp;
    requestId;
    constructor(message, details, requestId) {
        super(message);
        this.code = ErrorCode.CONFIGURATION_ERROR;
        this.details = details;
        this.timestamp = new Date();
        this.requestId = requestId;
        this.name = 'ConfigurationError';
    }
}
