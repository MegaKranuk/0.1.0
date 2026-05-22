"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_FILENAME = exports.PORT = exports.JWT_SECRET = exports.IS_DEV = exports.APP_ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
exports.APP_ENV = process.env.NODE_ENV === "production" ? "production" : "development";
exports.IS_DEV = exports.APP_ENV === "development";
const envPath = path_1.default.resolve(process.cwd(), `.env.${exports.APP_ENV}`);
dotenv_1.default.config({ path: envPath });
exports.JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-lab-5-mega-secure";
exports.PORT = Number(process.env.PORT) || 3000;
exports.DB_FILENAME = process.env.DB_FILENAME || "app.db";
