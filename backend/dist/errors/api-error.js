"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.message = message;
        this.details = details;
    }
}
exports.ApiError = ApiError;
