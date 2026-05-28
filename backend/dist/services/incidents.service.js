"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentsService = void 0;
const api_error_1 = require("../errors/api-error");
const ALLOWED_CRITICALITY = new Set([
    "Низька критичність",
    "Трохи критично",
    "Середня критичність",
    "Відчутна критичність",
    "Дуже критично",
]);
const ALLOWED_SORT_FIELDS = new Set([
    "date", "tag", "criticality", "reporter",
]);
class IncidentsService {
    constructor(repo) {
        this.repo = repo;
    }
    async getAll(query) {
        let data = await this.repo.findAll();
        if (query.tag) {
            data = data.filter((i) => i.tag === query.tag);
        }
        if (query.criticality && ALLOWED_CRITICALITY.has(query.criticality)) {
            data = data.filter((i) => i.criticality === query.criticality);
        }
        if (query.description) {
            const description = query.description.toLowerCase();
            data = data.filter((i) => (i.comment ?? "").toLowerCase().includes(description));
        }
        if (query.sortBy && ALLOWED_SORT_FIELDS.has(query.sortBy)) {
            const dir = query.sortDir === "desc" ? -1 : 1;
            const field = query.sortBy;
            data.sort((a, b) => {
                const valA = a[field] ?? "";
                const valB = b[field] ?? "";
                if (valA > valB)
                    return dir;
                if (valA < valB)
                    return -dir;
                return 0;
            });
        }
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Number(query.pageSize) || data.length || 1;
        const start = (page - 1) * pageSize;
        const total = data.length;
        return {
            items: data.slice(start, start + pageSize),
            meta: { totalItems: total, currentPage: page, pageSize, totalPages: Math.ceil(total / pageSize) },
        };
    }
    async getById(id, ownerUserId) {
        const incident = await this.repo.findById(id, ownerUserId);
        if (!incident)
            throw new api_error_1.ApiError(404, "NOT_FOUND", "Інцидент не знайдено");
        return incident;
    }
    async create(dto, ownerUserId) {
        this.validate(dto);
        try {
            return await this.repo.create(dto, ownerUserId);
        }
        catch (err) {
            if (err.message?.includes("UNIQUE constraint"))
                throw new api_error_1.ApiError(409, "CONFLICT", "Конфлікт даних");
            throw err;
        }
    }
    async update(id, dto, ownerUserId) {
        const updated = await this.repo.update(id, dto, ownerUserId);
        if (!updated)
            throw new api_error_1.ApiError(404, "NOT_FOUND", "Інцидент не знайдено або доступ заборонено");
        return updated;
    }
    async delete(id, ownerUserId) {
        const existing = await this.repo.findByIdPublic(id);
        if (!existing)
            throw new api_error_1.ApiError(404, "NOT_FOUND", "Інцидент не знайдено");
        if (existing.ownerUserId !== ownerUserId) {
            throw new api_error_1.ApiError(403, "FORBIDDEN", "Немає прав для видалення цього інциденту");
        }
        const deleted = await this.repo.delete(id, ownerUserId);
        if (!deleted)
            throw new api_error_1.ApiError(404, "NOT_FOUND", "Інцидент не знайдено");
    }
    async getStats() { return await this.repo.getStats(); }
    async searchVulnerable(q) { return await this.repo.searchVulnerable(q); }
    validate(dto) {
        const errors = [];
        if (!dto.date)
            errors.push("Поле date обов'язкове");
        if (!dto.reporter || dto.reporter.length < 5)
            errors.push("reporter: мінімум 5 символів");
        if (!dto.comment || dto.comment.length < 15)
            errors.push("comment: мінімум 15 символів");
        if (!ALLOWED_CRITICALITY.has(dto.criticality))
            errors.push("Невалідне значення criticality");
        if (errors.length)
            throw new api_error_1.ApiError(400, "VALIDATION_ERROR", "Невалідний запит", errors);
    }
    async deleteReporter(id) {
        const deleted = await this.repo.deleteReporter(id);
        if (!deleted)
            throw new api_error_1.ApiError(404, "NOT_FOUND", "Репортера не знайдено");
    }
    async getThreatStatsByTag(tag) { return await this.repo.getThreatStatsByTag(tag); }
    async getMostFrequent() {
        const result = await this.repo.getMostFrequent();
        if (!result)
            throw new api_error_1.ApiError(404, "NOT_FOUND", "Мало даних");
        return result;
    }
}
exports.IncidentsService = IncidentsService;
