using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Tasks;

/// <summary>Lightweight projection used in lists and the Kanban board.</summary>
public record TaskListItemDto(
    int Id,
    string Title,
    WorkTaskStatus Status,
    TaskPriority Priority,
    TaskType Type,
    int Progress,
    int BoardOrder,
    DateTime? StartDate,
    int ProjectId,
    string ProjectName,
    string ProjectColor,
    int? BranchId,
    string? BranchName,
    int? CategoryId,
    string? CategoryName,
    string? CategoryIcon,
    string? CategoryColor,
    int? AssigneeId,
    string? AssigneeName,
    string? AssigneeColor,
    int SubTaskCount,
    int CommentCount,
    IReadOnlyList<TagDto> Tags,
    DateTime CreatedAt);

public record TaskDetailDto(
    int Id,
    string Title,
    string? Description,
    WorkTaskStatus Status,
    TaskPriority Priority,
    TaskType Type,
    DateTime? StartDate,
    DateTime? CompletedAt,
    DateTime? ClaimedAt,
    int Progress,
    int ProjectId,
    string ProjectName,
    int? BranchId,
    string? BranchName,
    int? CategoryId,
    string? CategoryName,
    string? CategoryIcon,
    string? CategoryColor,
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
    int? CategoryId,
    int? AssigneeId,
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
    int? CategoryId,
    int? AssigneeId,
    int Progress,
    IReadOnlyList<int>? TagIds);

/// <summary>Payload for drag-and-drop moves on the Kanban board.</summary>
public record MoveTaskRequest(WorkTaskStatus Status, int BoardOrder);

/// <summary>Filtering/sorting options including category.</summary>

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
    public int? CategoryId { get; set; }
    public int? AssigneeId { get; set; }
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
