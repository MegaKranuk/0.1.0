"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const api_error_1 = require("../errors/api-error");
const config_1 = require("../config");
const errorHandler = (err, req, res, next) => {
    if (err instanceof api_error_1.ApiError) {
        return res.status(err.status).json({
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
                ...(config_1.IS_DEV ? { stack: err.stack } : {}),
            },
        });
    }
    console.error("[ErrorHandler]", err);
    return res.status(500).json({
        error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error",
            ...(config_1.IS_DEV && err instanceof Error ? { details: err.message, stack: err.stack } : {}),
        },
    });
};
exports.errorHandler = errorHandler;
