"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingMiddleware = void 0;
const loggingMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
};
exports.loggingMiddleware = loggingMiddleware;
