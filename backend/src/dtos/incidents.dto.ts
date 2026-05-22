export interface CreateIncidentRequestDto {
  date: string;
  tag: string;
  criticality: string;
  reporter: string;
  comment: string;
}

export interface UpdateIncidentRequestDto {
  date?: string;
  tag?: string;
  criticality?: string;
  reporter?: string;
  comment?: string;
}

export interface IncidentResponseDto {
  id: string;
  date: string;
  tag: string;
  criticality: string;
  ownerUserId?: string;
  reporterId: string;
  reporter: string;
  comment: string;
}
export interface FindAllQueryDto {
  tag?: string;
  criticality?: string;
  description?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}