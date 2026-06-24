using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Tasks;

/// <summary>Lightweight projection used in lists and the Kanban board.</summary>
public record TaskListItemDto(
    int Id,
    string Title,
    WorkTaskStatus Status,
    TaskPriority Priority,
    TaskType Type,
    DateTime? DueDate,
    DateTime? SlaDueDate,
    int Progress,
    int BoardOrder,
    int ProjectId,
    string ProjectName,
    string ProjectColor,
    int? BranchId,
    string? BranchName,
    int? AssigneeId,
    string? AssigneeName,
    string? AssigneeColor,
    int SubTaskCount,
    int CommentCount,
    IReadOnlyList<TagDto> Tags,
    bool IsOverdue);

public record TaskDetailDto(
    int Id,
    string Title,
    string? Description,
    WorkTaskStatus Status,
    TaskPriority Priority,
    TaskType Type,
    DateTime? StartDate,
    DateTime? DueDate,
    DateTime? CompletedAt,
    DateTime? SlaDueDate,
    decimal? EstimatedHours,
    decimal? ActualHours,
    int Progress,
    int ProjectId,
    string ProjectName,
    int? BranchId,
    string? BranchName,
    int? AssigneeId,
    string? AssigneeName,
    int? ReporterId,
    string? ReporterName,
    int? ParentTaskId,
    string? ParentTaskTitle,
    IReadOnlyList<TagDto> Tags,
    IReadOnlyList<TaskListItemDto> SubTasks,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record CreateTaskRequest(
    string Title,
    string? Description,
    WorkTaskStatus Status,
    TaskPriority Priority,
    TaskType Type,
    int ProjectId,
    int? BranchId,
    int? AssigneeId,
    DateTime? StartDate,
    DateTime? DueDate,
    DateTime? SlaDueDate,
    decimal? EstimatedHours,
    int? ParentTaskId,
    IReadOnlyList<int>? TagIds);

public record UpdateTaskRequest(
    string Title,
    string? Description,
    WorkTaskStatus Status,
    TaskPriority Priority,
    TaskType Type,
    int ProjectId,
    int? BranchId,
    int? AssigneeId,
    DateTime? StartDate,
    DateTime? DueDate,
    DateTime? SlaDueDate,
    decimal? EstimatedHours,
    decimal? ActualHours,
    int Progress,
    IReadOnlyList<int>? TagIds);

/// <summary>Payload for drag-and-drop moves on the Kanban board.</summary>
public record MoveTaskRequest(WorkTaskStatus Status, int BoardOrder);

public record TagDto(int Id, string Name, string Color, string? Icon);

public record CreateTagRequest(string Name, string Color, string? Icon);
public record UpdateTagRequest(string Name, string Color, string? Icon);

/// <summary>Filtering/sorting/paging options for the task list.</summary>
public class TaskQuery
{
    public string? Search { get; set; }
    public WorkTaskStatus? Status { get; set; }
    public List<WorkTaskStatus>? Statuses { get; set; }
    public TaskPriority? Priority { get; set; }
    public TaskType? Type { get; set; }
    public int? ProjectId { get; set; }
    public int? BranchId { get; set; }
    public int? AssigneeId { get; set; }
    public bool? Overdue { get; set; }
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
