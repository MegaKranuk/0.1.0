"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.getUsers = async (_req, res, next) => {
            try {
                res.json({ data: await this.authService.getUsers() });
            }
            catch (e) {
                next(e);
            }
        };
        this.register = async (req, res, next) => {
            try {
                const { name, password } = req.body;
                const result = await this.authService.register(name, password);
                res.status(201).json(result);
            }
            catch (e) {
                next(e);
            }
        };
        this.login = async (req, res, next) => {
            try {
                const { name, password } = req.body;
                const result = await this.authService.login(name, password);
                res.json(result);
            }
            catch (e) {
                next(e);
            }
        };
    }
}
exports.AuthController = AuthController;
