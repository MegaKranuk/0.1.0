"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtAuth = jwtAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function jwtAuth(req, res, next) {
    const authHeader = req.header("Authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Відсутній токен" } });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
        req.user = { id: decoded.id, name: decoded.name };
        next();
    }
    catch (err) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Невалідний токен" } });
    }
}
