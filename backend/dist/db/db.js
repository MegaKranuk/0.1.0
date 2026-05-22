"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const dataDir = path_1.default.join(__dirname, "../../data");
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path_1.default.join(dataDir, config_1.DB_FILENAME);
exports.db = new (sqlite3_1.default.verbose()).Database(dbPath, (err) => {
    if (err) {
        console.error("Failed to open SQLite DB:", err.message);
        process.exit(1);
    }
});
