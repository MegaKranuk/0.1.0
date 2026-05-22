import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import incidentsRoutes from "./routes/incidents.routes";
import authRoutes from "./routes/auth.routes";
import { loggingMiddleware } from "./middleware/logging.middleware";
import { errorHandler } from "./middleware/error-handler.middleware";
import { securityHeaders } from "./middleware/security-headers.middleware";
import { jwtAuth } from "./middleware/jwt-auth.middleware";
import { PORT, APP_ENV } from "./config";
import { migrate } from "./db/migrate";


const app = express();
const swaggerPath = [
  path.join(__dirname, "swagger.json"),
  path.join(__dirname, "../src/swagger.json")
].find((candidate) => fs.existsSync(candidate));

if (!swaggerPath) {
  throw new Error("Swagger document was not found");
}

const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
  swaggerDocument.servers = [
    {
      url: `http://localhost:${PORT}`,
      description: APP_ENV === "production" ? "Production Server" : "Development Server"
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
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("CORS not allowed"));
  },
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(securityHeaders);
app.use(express.json());
app.use(loggingMiddleware);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/incidents", jwtAuth, incidentsRoutes);

app.get("/api-docs.json", (_req, res) => res.json(swaggerDocument));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, { swaggerOptions: { persistAuthorization: true } }));
app.use(errorHandler);

async function bootstrap() {
  await migrate();
  app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`)); 
}

bootstrap().catch(console.error);
