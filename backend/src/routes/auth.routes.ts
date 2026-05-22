import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { AuthService } from "../services/auth.service";
import { jwtAuth } from "../middleware/jwt-auth.middleware";

const router = Router();
const authService = new AuthService();
const authController = new AuthController(authService);

router.get("/users", jwtAuth, authController.getUsers);
router.post("/register", authController.register);
router.post("/login", authController.login);

export default router;
