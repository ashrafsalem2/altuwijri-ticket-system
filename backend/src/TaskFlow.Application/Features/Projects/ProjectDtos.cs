using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Projects;

public record ProjectDto(
    int Id,
    string Name,
    string Code,
    string? Description,
    string Color,
    ProjectStatus Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int? LeadId,
    string? LeadName,
    int TaskCount,
    int CompletedTaskCount,
    DateTime CreatedAt);

public record CreateProjectRequest(
    string Name,
    string Code,
    string? Description,
    string Color,
    ProjectStatus Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int? LeadId);

public record UpdateProjectRequest(
    string Name,
    string? Description,
    string Color,
    ProjectStatus Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int? LeadId);
