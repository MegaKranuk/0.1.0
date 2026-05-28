"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const incidents_routes_1 = __importDefault(require("./routes/incidents.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const logging_middleware_1 = require("./middleware/logging.middleware");
const error_handler_middleware_1 = require("./middleware/error-handler.middleware");
const security_headers_middleware_1 = require("./middleware/security-headers.middleware");
const jwt_auth_middleware_1 = require("./middleware/jwt-auth.middleware");
const config_1 = require("./config");
const migrate_1 = require("./db/migrate");
const app = (0, express_1.default)();
const swaggerPath = [
    path_1.default.join(__dirname, "swagger.json"),
    path_1.default.join(__dirname, "../src/swagger.json")
].find((candidate) => fs_1.default.existsSync(candidate));
if (!swaggerPath) {
    throw new Error("Swagger document was not found");
}
const swaggerDocument = JSON.parse(fs_1.default.readFileSync(swaggerPath, "utf8"));
swaggerDocument.servers = [
    {
        url: `http://localhost:${config_1.PORT}`,
        description: config_1.APP_ENV === "production" ? "Production Server" : "Development Server"
    }
];
const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin))
            return callback(null, true);
        callback(new Error("CORS not allowed"));
    },
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(security_headers_middleware_1.securityHeaders);
app.use(express_1.default.json());
app.use(logging_middleware_1.loggingMiddleware);
app.use("/api/v1/auth", auth_routes_1.default);
app.use("/api/v1/incidents", jwt_auth_middleware_1.jwtAuth, incidents_routes_1.default);
app.get("/api-docs.json", (_req, res) => res.json(swaggerDocument));
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument, { swaggerOptions: { persistAuthorization: true } }));
app.use(error_handler_middleware_1.errorHandler);
async function bootstrap() {
    await (0, migrate_1.migrate)();
    app.listen(config_1.PORT, () => console.log(`Server is running on http://localhost:${config_1.PORT}`));
}
bootstrap().catch(console.error);
