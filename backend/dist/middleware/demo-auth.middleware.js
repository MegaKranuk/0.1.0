"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoAuth = demoAuth;
const dbClient_1 = require("../db/dbClient");
async function demoAuth(req, res, next) {
    const userId = req.header("X-Demo-UserId");
    if (!userId) {
        res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Відсутній заголовок X-Demo-UserId" },
        });
        return;
    }
    if (typeof userId !== "string" || userId.trim() === "" || userId.length > 64) {
        res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Невалідний X-Demo-UserId" },
        });
        return;
    }
    const cleanUserId = userId.trim();
    let user = await (0, dbClient_1.get)("SELECT id, name FROM Users WHERE id = ?", [cleanUserId]);
    if (!user) {
        try {
            await (0, dbClient_1.run)("INSERT INTO Users (id, name) VALUES (?, ?)", [cleanUserId, "Демо Користувач"]);
            user = { id: cleanUserId, name: "Демо Користувач" };
        }
        catch (err) {
            console.error("Помилка при автостворенні юзера:", err);
            res.status(401).json({
                error: { code: "UNAUTHORIZED", message: "Користувача не знайдено і не вдалося створити" },
            });
            return;
        }
    }
    req.user = user;
    next();
}
