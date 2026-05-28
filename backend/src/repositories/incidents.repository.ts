import { v4 as uuid } from "uuid";
import { all, get, run } from "../db/dbClient";
import {
  IncidentResponseDto,
  CreateIncidentRequestDto,
  UpdateIncidentRequestDto,
  FindAllQueryDto,
} from "../dtos/incidents.dto";

export class IncidentsRepository {
  async findAll(query: FindAllQueryDto): Promise<{ items: IncidentResponseDto[]; total: number }> {
    
    let coreSql = `
      FROM Incidents i
      JOIN Reporters r ON i.reporterId = r.id
      LEFT JOIN Comments c ON c.incidentId = i.id
    `;

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (query.tag) {
      whereClauses.push("i.tag = ?");
      params.push(query.tag);
    }

    if (query.criticality) {
      whereClauses.push("i.criticality = ?");
      params.push(query.criticality);
    }

    if (query.description) {
      whereClauses.push("c.text LIKE '%' || ? || '%'");
      params.push(query.description);
    }

    if (whereClauses.length > 0) {
      coreSql += " WHERE " + whereClauses.join(" AND ");
    }

    const countSql = `SELECT COUNT(*) as count ${coreSql}`;
    const countResult = await get<{ count: number }>(countSql, params);
    const total = countResult?.count ?? 0;

    const allowedSortFields: Record<string, string> = {
      date: "i.date",
      tag: "i.tag",
      criticality: "i.criticality",
      reporter: "r.name",
    };

    const sortByField = query.sortBy && allowedSortFields[query.sortBy] 
      ? allowedSortFields[query.sortBy] 
      : "i.date";
      
    const sortDir = query.sortDir === "desc" ? "DESC" : "ASC";
    coreSql += ` ORDER BY ${sortByField} ${sortDir}`;

    if (query.page && query.pageSize) {
      const limit = query.pageSize;
      const offset = (query.page - 1) * query.pageSize;
      coreSql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
    }

    const selectSql = `
      SELECT
        i.id, i.date, i.tag, i.criticality,
        i.ownerUserId,
        r.id as reporterId,
        r.name as reporter,
        c.text as comment
      ${coreSql}
    `;

    const items = await all<IncidentResponseDto>(selectSql, params);

    return { items, total };
  }

  async findById(id: string, ownerUserId: string): Promise<IncidentResponseDto | null> {
    const row = await get<IncidentResponseDto>(
      `SELECT
         i.id, i.date, i.tag, i.criticality,
         i.ownerUserId,
         r.id as reporterId,
         r.name as reporter,
         c.text as comment
       FROM Incidents i
       JOIN Reporters r ON i.reporterId = r.id
       LEFT JOIN Comments c ON c.incidentId = i.id
       WHERE i.id = ? AND i.ownerUserId = ?`,
      [id, ownerUserId]
    );
    return row ?? null;
  }

  async findByIdPublic(id: string): Promise<IncidentResponseDto | null> {
    const row = await get<IncidentResponseDto>(
      `SELECT
         i.id, i.date, i.tag, i.criticality,
         i.ownerUserId,
         r.id as reporterId,
         r.name as reporter,
         c.text as comment
       FROM Incidents i
       JOIN Reporters r ON i.reporterId = r.id
       LEFT JOIN Comments c ON c.incidentId = i.id
       WHERE i.id = ?`,
      [id]
    );
    return row ?? null;
  }

  async create(data: CreateIncidentRequestDto, ownerUserId: string): Promise<IncidentResponseDto> {
    const newReporterId = uuid();
    await run(`INSERT OR IGNORE INTO Reporters (id, name) VALUES (?, ?)`, [newReporterId, data.reporter]);
    const reporter = await get<{ id: string }>(`SELECT id FROM Reporters WHERE name = ?`, [data.reporter]);

    const incidentId = uuid();
    await run(
      `INSERT INTO Incidents (id, reporterId, date, tag, criticality, ownerUserId) VALUES (?, ?, ?, ?, ?, ?)`,
      [incidentId, reporter!.id, data.date, data.tag, data.criticality, ownerUserId]
    );

    const commentId = uuid();
    await run(`INSERT INTO Comments (id, incidentId, text) VALUES (?, ?, ?)`, [commentId, incidentId, data.comment]);

    return (await this.findByIdPublic(incidentId)) as IncidentResponseDto;
  }

  async update(id: string, data: UpdateIncidentRequestDto, ownerUserId: string): Promise<IncidentResponseDto | null> {
    const existing = await get<{ id: string }>(
      `SELECT id FROM Incidents WHERE id = ? AND ownerUserId = ?`,
      [id, ownerUserId]
    );
    if (!existing) return null;

    if (data.reporter) {
      const newReporterId = uuid();
      await run(`INSERT OR IGNORE INTO Reporters (id, name) VALUES (?, ?)`, [newReporterId, data.reporter]);
      const reporter = await get<{ id: string }>(`SELECT id FROM Reporters WHERE name = ?`, [data.reporter]);
      if (reporter) {
        await run(`UPDATE Incidents SET reporterId = ? WHERE id = ? AND ownerUserId = ?`, [reporter.id, id, ownerUserId]);
      }
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    if (data.date)        { setClauses.push("date = ?");        params.push(data.date); }
    if (data.tag)         { setClauses.push("tag = ?");         params.push(data.tag); }
    if (data.criticality) { setClauses.push("criticality = ?"); params.push(data.criticality); }

    if (setClauses.length > 0) {
      const finalParams = [...params, id, ownerUserId];
      await run(`UPDATE Incidents SET ${setClauses.join(", ")} WHERE id = ? AND ownerUserId = ?`, finalParams);
    }

    if (data.comment) {
      await run(`UPDATE Comments SET text = ? WHERE incidentId = ?`, [data.comment, id]);
    }

    return await this.findByIdPublic(id);
  }

  async delete(id: string, ownerUserId: string): Promise<boolean> {
    const existing = await get<{ id: string }>(
      `SELECT id FROM Incidents WHERE id = ? AND ownerUserId = ?`,
      [id, ownerUserId]
    );
    if (!existing) return false;

    await run(
      `DELETE FROM Comments WHERE incidentId = ?`,
      [id]
    );

    const result = await run(
      `DELETE FROM Incidents WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  async getStats() {
    return await all(`
      SELECT tag, COUNT(*) as incidentCount
      FROM Incidents
      GROUP BY tag
      ORDER BY incidentCount DESC
    `);
  }

  async searchVulnerable(query: string) {
    return await all(
      `SELECT * FROM Incidents WHERE tag LIKE '%' || ? || '%' ORDER BY date DESC LIMIT 20`,
      [query]
    );
  }

  async getMostFrequent(): Promise<{ tag: string; incidentCount: number }[] | null> {
    const rows = await all<{ tag: string; incidentCount: number }>(`
      SELECT tag, COUNT(*) as incidentCount
      FROM Incidents
      GROUP BY tag
      ORDER BY incidentCount DESC
      LIMIT 3
    `);
    return rows ?? null;
  }

  async getThreatStatsByTag(tag: string) {
    return await all(
      `SELECT
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
       END DESC`,
      [tag]
    );
  }

  async deleteReporter(reporterId: string): Promise<boolean> {
    await run("DELETE FROM Incidents WHERE reporterId = ?", [reporterId]);
    const result = await run("DELETE FROM Reporters WHERE id = ?", [reporterId]);
    return result.changes > 0;
  }
}