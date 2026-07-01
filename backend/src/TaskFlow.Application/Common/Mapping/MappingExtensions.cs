using TaskFlow.Application.Features.Comments;
using TaskFlow.Application.Features.Notifications;
using TaskFlow.Application.Features.Projects;
using TaskFlow.Application.Features.Tasks;
using TaskFlow.Application.Features.Users;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Common.Mapping;

/// <summary>Hand-written, allocation-friendly mappings from entities to DTOs.</summary>
public static class MappingExtensions
{
    public static UserDto ToDto(this User u) => new(
        u.Id, u.UserName, u.Email, u.FullName, u.JobTitle,
        u.DepartmentId, u.Department?.Name, u.PhoneNumber,
        u.AvatarColor, u.IsActive, u.IsAvailable, u.RoleId, u.Role?.Name ?? string.Empty,
        u.BranchId, u.Branch?.Name, u.Branch?.Area?.Name,
        u.Categories?.Select(uc => uc.CategoryId).ToList() ?? new(),
        u.Categories?.Select(uc => uc.Category?.Name ?? string.Empty).ToList() ?? new(),
        u.Branches?.Select(ub => ub.BranchId).ToList() ?? new(),
        u.Branches?.Select(ub => ub.Branch?.Name ?? string.Empty).ToList() ?? new(),
        u.IssuableCategories?.Select(ic => ic.CategoryId).ToList() ?? new(),
        u.IssuableCategories?.Select(ic => ic.Category?.Name ?? string.Empty).ToList() ?? new(),
        u.LastLoginAt, u.CreatedAt);

    public static RoleDto ToDto(this Role r) => new(r.Id, r.Name, r.Description);

    public static ProjectDto ToDto(this Project p) => new(
        p.Id, p.Name, p.Code, p.Description, p.Color, p.Status, p.StartDate, p.EndDate,
        p.LeadId, p.Lead?.FullName,
        p.Tasks?.Count(t => !t.IsDeleted) ?? 0,
        p.Tasks?.Count(t => !t.IsDeleted && t.Status == WorkTaskStatus.Done) ?? 0,
        p.CreatedAt);

    public static TagDto ToDto(this Tag t) => new(t.Id, t.Name, t.Color, t.Icon);

    public static CommentDto ToDto(this Comment c) => new(
        c.Id, c.Content, c.TaskId, c.AuthorId, c.Author?.FullName ?? string.Empty,
        c.Author?.AvatarColor, c.CreatedAt, c.UpdatedAt);

    public static NotificationDto ToDto(this Notification n) => new(
        n.Id, n.Type, n.Title, n.Message, n.IsRead, n.TaskId, n.CreatedAt);

    public static TaskListItemDto ToListItem(this WorkTask t) => new(
        t.Id, t.Title, t.Status, t.Priority, t.Type, t.Progress, t.BoardOrder, t.StartDate,
        t.ProjectId, t.Project?.Name ?? string.Empty, t.Project?.Color ?? "#3b82f6",
        t.BranchId, t.Branch?.Name,
        t.CategoryId, t.Category?.Name, t.Category?.Icon, t.Category?.Color,
        t.AssigneeId, t.Assignee?.FullName, t.Assignee?.AvatarColor,
        t.SubTasks?.Count ?? 0, t.Comments?.Count ?? 0,
        t.TaskTags?.Select(tt => tt.Tag.ToDto()).ToList() ?? new List<TagDto>(),
        t.CreatedAt);

    public static TaskDetailDto ToDetail(this WorkTask t) => new(
        t.Id, t.Title, t.Description, t.Status, t.Priority, t.Type, t.StartDate, t.CompletedAt, t.ClaimedAt,
        t.Progress, t.ProjectId, t.Project?.Name ?? string.Empty,
        t.BranchId, t.Branch?.Name,
        t.CategoryId, t.Category?.Name, t.Category?.Icon, t.Category?.Color,
        t.AssigneeId, t.Assignee?.FullName, t.ReporterId, t.Reporter?.FullName,
        t.ParentTaskId, t.ParentTask?.Title,
        t.TaskTags?.Select(tt => tt.Tag.ToDto()).ToList() ?? new List<TagDto>(),
        t.SubTasks?.Select(s => s.ToListItem()).ToList() ?? new List<TaskListItemDto>(),
        t.CreatedAt, t.UpdatedAt);
}
