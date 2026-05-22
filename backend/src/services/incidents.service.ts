import { ApiError } from "../errors/api-error";
import { IncidentsRepository } from "../repositories/incidents.repository";
import { CreateIncidentRequestDto, UpdateIncidentRequestDto, IncidentResponseDto } from "../dtos/incidents.dto";

interface IncidentQuery {
  tag?: string;
  criticality?: string;
  description?: string;
  sortBy?: keyof IncidentResponseDto;
  sortDir?: "asc" | "desc";
  page?: string;
  pageSize?: string;
}

const ALLOWED_CRITICALITY = new Set([
  "Низька критичність",
  "Трохи критично",
  "Середня критичність",
  "Відчутна критичність",
  "Дуже критично",
]);

const ALLOWED_SORT_FIELDS = new Set<keyof IncidentResponseDto>([
  "date", "tag", "criticality", "reporter",
]);

export class IncidentsService {
  constructor(private repo: IncidentsRepository) {}

  async getAll(query: IncidentQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Number(query.pageSize) || 10;

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.has(query.sortBy) ? query.sortBy : undefined;
    const sortDir = query.sortDir === "desc" ? "desc" : "asc";
    const criticality = query.criticality && ALLOWED_CRITICALITY.has(query.criticality) ? query.criticality : undefined;

    const { items, total } = await this.repo.findAll({
      tag: query.tag,
      criticality,
      description: query.description,
      sortBy,
      sortDir,
      page,
      pageSize
    });

    return {
      items,
      meta: {
        totalItems: total,
        currentPage: page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
    };
  }

  async getById(id: string, ownerUserId: string) {
    const incident = await this.repo.findById(id, ownerUserId);
    if (!incident) throw new ApiError(404, "NOT_FOUND", "Інцидент не знайдено");
    return incident;
  }

  async create(dto: CreateIncidentRequestDto, ownerUserId: string) {
    this.validate(dto);
    try {
      return await this.repo.create(dto, ownerUserId);
    } catch (err: any) {
      if (err.message?.includes("UNIQUE constraint")) throw new ApiError(409, "CONFLICT", "Конфлікт даних");
      throw err;
    }
  }

  async update(id: string, dto: UpdateIncidentRequestDto, ownerUserId: string) {
    const updated = await this.repo.update(id, dto, ownerUserId);
    if (!updated) throw new ApiError(404, "NOT_FOUND", "Інцидент не знайдено або доступ заборонено");
    return updated;
  }

  async delete(id: string, ownerUserId: string) {
    const existing = await this.repo.findByIdPublic(id);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Інцидент не знайдено");
    if (existing.ownerUserId !== ownerUserId) {
      throw new ApiError(403, "FORBIDDEN", "Немає прав для видалення цього інциденту");
    }

    const deleted = await this.repo.delete(id, ownerUserId);
    if (!deleted) throw new ApiError(404, "NOT_FOUND", "Інцидент не знайдено");
  }

  async getStats() { return await this.repo.getStats(); }

  async searchVulnerable(q: string) { return await this.repo.searchVulnerable(q); }

  private validate(dto: CreateIncidentRequestDto) {
    const errors: string[] = [];
    if (!dto.date) errors.push("Поле date обов'язкове");
    if (!dto.reporter || dto.reporter.length < 5) errors.push("reporter: мінімум 5 символів");
    if (!dto.comment || dto.comment.length < 15) errors.push("comment: мінімум 15 символів");
    if (!ALLOWED_CRITICALITY.has(dto.criticality)) errors.push("Невалідне значення criticality");
    if (errors.length) throw new ApiError(400, "VALIDATION_ERROR", "Невалідний запит", errors);
  }

  async deleteReporter(id: string) {
    const deleted = await this.repo.deleteReporter(id);
    if (!deleted) throw new ApiError(404, "NOT_FOUND", "Репортера не знайдено");
  }

  async getThreatStatsByTag(tag: string) { return await this.repo.getThreatStatsByTag(tag); }

  async getMostFrequent() {
    const result = await this.repo.getMostFrequent();
    if (!result) throw new ApiError(404, "NOT_FOUND", "Мало даних");
    return result;
  }
}