import dotenv from "dotenv";
import path from "path";

export const APP_ENV = process.env.NODE_ENV === "production" ? "production" : "development";
export const IS_DEV = APP_ENV === "development";

const envPath = path.resolve(process.cwd(), `.env.${APP_ENV}`);
dotenv.config({ path: envPath });

export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-lab-5-mega-secure";
export const PORT = Number(process.env.PORT) || 3000;
export const DB_FILENAME = process.env.DB_FILENAME || "app.db";