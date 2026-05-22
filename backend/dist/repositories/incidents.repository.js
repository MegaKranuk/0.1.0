"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentsRepository = void 0;
const uuid_1 = require("uuid");
const dbClient_1 = require("../db/dbClient");
class IncidentsRepository {
    async findAll() {
        return await (0, dbClient_1.all)(`
      SELECT
        i.id, i.date, i.tag, i.criticality,
        i.ownerUserId,
        r.id as reporterId,
        r.name as reporter,
        c.text as comment
      FROM Incidents i
      JOIN Reporters r ON i.reporterId = r.id
      LEFT JOIN Comments c ON c.incidentId = i.id
      ORDER BY i.date DESC
    `);
    }
    async findById(id, ownerUserId) {
        const row = await (0, dbClient_1.get)(`SELECT
         i.id, i.date, i.tag, i.criticality,
         i.ownerUserId,
         r.id as reporterId,
         r.name as reporter,
         c.text as comment
       FROM Incidents i
       JOIN Reporters r ON i.reporterId = r.id
       LEFT JOIN Comments c ON c.incidentId = i.id
       WHERE i.id = ? AND i.ownerUserId = ?`, [id, ownerUserId]);
        return row ?? null;
    }
    async findByIdPublic(id) {
        const row = await (0, dbClient_1.get)(`SELECT
         i.id, i.date, i.tag, i.criticality,
         i.ownerUserId,
         r.id as reporterId,
         r.name as reporter,
         c.text as comment
       FROM Incidents i
       JOIN Reporters r ON i.reporterId = r.id
       LEFT JOIN Comments c ON c.incidentId = i.id
       WHERE i.id = ?`, [id]);
        return row ?? null;
    }
    async create(data, ownerUserId) {
        const newReporterId = (0, uuid_1.v4)();
        await (0, dbClient_1.run)(`INSERT OR IGNORE INTO Reporters (id, name) VALUES (?, ?)`, [newReporterId, data.reporter]);
        const reporter = await (0, dbClient_1.get)(`SELECT id FROM Reporters WHERE name = ?`, [data.reporter]);
        const incidentId = (0, uuid_1.v4)();
        await (0, dbClient_1.run)(`INSERT INTO Incidents (id, reporterId, date, tag, criticality, ownerUserId) VALUES (?, ?, ?, ?, ?, ?)`, [incidentId, reporter.id, data.date, data.tag, data.criticality, ownerUserId]);
        const commentId = (0, uuid_1.v4)();
        await (0, dbClient_1.run)(`INSERT INTO Comments (id, incidentId, text) VALUES (?, ?, ?)`, [commentId, incidentId, data.comment]);
        return (await this.findByIdPublic(incidentId));
    }
    async update(id, data, ownerUserId) {
        const existing = await (0, dbClient_1.get)(`SELECT id FROM Incidents WHERE id = ? AND ownerUserId = ?`, [id, ownerUserId]);
        if (!existing)
            return null;
        if (data.reporter) {
            const newReporterId = (0, uuid_1.v4)();
            await (0, dbClient_1.run)(`INSERT OR IGNORE INTO Reporters (id, name) VALUES (?, ?)`, [newReporterId, data.reporter]);
            const reporter = await (0, dbClient_1.get)(`SELECT id FROM Reporters WHERE name = ?`, [data.reporter]);
            if (reporter) {
                await (0, dbClient_1.run)(`UPDATE Incidents SET reporterId = ? WHERE id = ? AND ownerUserId = ?`, [reporter.id, id, ownerUserId]);
            }
        }
        const setClauses = [];
        const params = [];
        if (data.date) {
            setClauses.push("date = ?");
            params.push(data.date);
        }
        if (data.tag) {
            setClauses.push("tag = ?");
            params.push(data.tag);
        }
        if (data.criticality) {
            setClauses.push("criticality = ?");
            params.push(data.criticality);
        }
        if (setClauses.length > 0) {
            params.push(id, ownerUserId);
            await (0, dbClient_1.run)(`UPDATE Incidents SET ${setClauses.join(", ")} WHERE id = ? AND ownerUserId = ?`, params);
        }
        if (data.comment) {
            await (0, dbClient_1.run)(`UPDATE Comments SET text = ? WHERE incidentId = ?`, [data.comment, id]);
        }
        return await this.findByIdPublic(id);
    }
    async delete(id, ownerUserId) {
        const existing = await (0, dbClient_1.get)(`SELECT id FROM Incidents WHERE id = ? AND ownerUserId = ?`, [id, ownerUserId]);
        if (!existing)
            return false;
        await (0, dbClient_1.run)(`DELETE FROM Comments WHERE incidentId = ?`, [id]);
        const result = await (0, dbClient_1.run)(`DELETE FROM Incidents WHERE id = ?`, [id]);
        return result.changes > 0;
    }
    async getStats() {
        return await (0, dbClient_1.all)(`
      SELECT tag, COUNT(*) as incidentCount
      FROM Incidents
      GROUP BY tag
      ORDER BY incidentCount DESC
    `);
    }
    async searchVulnerable(query) {
        return await (0, dbClient_1.all)(`SELECT * FROM Incidents WHERE tag LIKE ? ORDER BY date DESC LIMIT 20`, [`%${query}%`]);
    }
    async getMostFrequent() {
        const rows = await (0, dbClient_1.all)(`
      SELECT tag, COUNT(*) as incidentCount
      FROM Incidents
      GROUP BY tag
      ORDER BY incidentCount DESC
      LIMIT 3
    `);
        return rows ?? null;
    }
    async getThreatStatsByTag(tag) {
        return await (0, dbClient_1.all)(`SELECT
         r.name as reporter,
         i.criticality,
         GROUP_CONCAT(c.text, '\n') as description
       FROM Incidents i
       JOIN Reporters r ON r.id = i.reporterId
       LEFT JOIN Comments c ON c.incidentId = i.id
       WHERE i.tag = ?
       GROUP BY i.criticality
       ORDER BY CASE i.criticality
         WHEN 'Дуже критично'        THEN 5
         WHEN 'Відчутна критичність' THEN 4
         WHEN 'Середня критичність'  THEN 3
         WHEN 'Трохи критично'       THEN 2
         WHEN 'Низька критичність'   THEN 1
         ELSE 0
       END DESC`, [tag]);
    }
    async deleteReporter(reporterId) {
        await (0, dbClient_1.run)("DELETE FROM Incidents WHERE reporterId = ?", [reporterId]);
        const result = await (0, dbClient_1.run)("DELETE FROM Reporters WHERE id = ?", [reporterId]);
        return result.changes > 0;
    }
}
exports.IncidentsRepository = IncidentsRepository;
