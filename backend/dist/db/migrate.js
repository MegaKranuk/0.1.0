"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbClient_1 = require("./dbClient");
async function migrate() {
    await (0, dbClient_1.run)("PRAGMA foreign_keys = ON;");
    await (0, dbClient_1.run)(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      appliedAt TEXT NOT NULL
    );
  `);
    const migrationsDir = path_1.default.join(__dirname, "migrations");
    if (!fs_1.default.existsSync(migrationsDir)) {
        console.warn(`Папка міграцій не знайдена: ${migrationsDir}`);
        return;
    }
    const files = fs_1.default
        .readdirSync(migrationsDir)
        .filter((f) => /^\d+_.+\.sql$/.test(f))
        .sort();
    const applied = await (0, dbClient_1.all)("SELECT filename FROM schema_migrations;");
    const appliedSet = new Set(applied.map((x) => x.filename));
    for (const file of files) {
        if (appliedSet.has(file))
            continue;
        const fullPath = path_1.default.join(migrationsDir, file);
        const sql = fs_1.default.readFileSync(fullPath, "utf8").trim();
        if (!sql)
            continue;
        try {
            await (0, dbClient_1.run)(sql);
            const now = new Date().toISOString();
            await (0, dbClient_1.run)("INSERT INTO schema_migrations (filename, appliedAt) VALUES (?, ?);", [file, now]);
            console.log(`Migration applied: ${file}`);
        }
        catch (err) {
            console.error(`Error applying migration ${file}:`, err);
            process.exit(1);
        }
    }
    console.log("Database is up to date.");
}
