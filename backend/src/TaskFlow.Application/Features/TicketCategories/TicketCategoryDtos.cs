namespace TaskFlow.Application.Features.TicketCategories;

public record TicketCategoryDto(
    int Id,
    string Name,
    string? NameAr,
    string? Description,
    string Icon,
    string Color,
    int DisplayOrder,
    bool IsActive,
    int TaskCount,
    int TechnicianCount,
    string? DefaultType);

public record SaveTicketCategoryRequest(
    string Name,
    string? NameAr,
    string? Description,
    string Icon,
    string Color,
    int DisplayOrder,
    bool IsActive,
    string? DefaultType);
