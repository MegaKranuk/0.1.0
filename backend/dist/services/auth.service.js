"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const dbClient_1 = require("../db/dbClient");
const api_error_1 = require("../errors/api-error");
const config_1 = require("../config");
class AuthService {
    async getUsers() {
        return await (0, dbClient_1.all)("SELECT id, name FROM Users ORDER BY name ASC");
    }
    async register(name, passwordRaw) {
        if (!name || !passwordRaw || passwordRaw.length < 4) {
            throw new api_error_1.ApiError(400, "BAD_REQUEST", "Ім'я та пароль (мінімум 4 символи) обов'язкові");
        }
        const existing = await (0, dbClient_1.get)("SELECT id FROM Users WHERE name = ?", [name]);
        if (existing) {
            throw new api_error_1.ApiError(409, "CONFLICT", "Користувач з таким ім'ям вже існує");
        }
        const id = (0, uuid_1.v4)();
        const hash = await bcrypt_1.default.hash(passwordRaw, 10);
        await (0, dbClient_1.run)("INSERT INTO Users (id, name, passwordHash) VALUES (?, ?, ?)", [id, name, hash]);
        return { message: "Реєстрація успішна", userId: id };
    }
    async login(name, passwordRaw) {
        const user = await (0, dbClient_1.get)("SELECT id, name, passwordHash FROM Users WHERE name = ?", [name]);
        if (!user || !user.passwordHash) {
            throw new api_error_1.ApiError(401, "UNAUTHORIZED", "Невірні облікові дані");
        }
        const isValid = await bcrypt_1.default.compare(passwordRaw, user.passwordHash);
        if (!isValid) {
            throw new api_error_1.ApiError(401, "UNAUTHORIZED", "Невірні облікові дані");
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, name: user.name }, config_1.JWT_SECRET, { expiresIn: "2h" });
        return { token };
    }
}
exports.AuthService = AuthService;
