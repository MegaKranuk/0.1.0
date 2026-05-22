export function toListItemViewModel(dto) {
    return {
        id: dto.id,
        reporterId: dto.reporterId ?? "",
        date: dto.date ?? "–",
        tag: dto.tag ?? "–",
        criticality: dto.criticality ?? "–",
        reporter: dto.reporter ?? "(невідомо)",
        comment: dto.comment ?? "",
    };
}
