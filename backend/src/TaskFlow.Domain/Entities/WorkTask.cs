using TaskFlow.Domain.Common;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

/// <summary>The central work item. Supports subtasks via self-reference.</summary>
public class WorkTask : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public WorkTaskStatus Status { get; set; } = WorkTaskStatus.Backlog;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public TaskType Type { get; set; } = TaskType.Task;

    public DateTime? StartDate { get; set; }
    public DateTime? CompletedAt { get; set; }

    /// <summary>When a technician first accepted/claimed this ticket (set once, never overwritten).</summary>
    public DateTime? ClaimedAt { get; set; }

    /// <summary>Completion percentage 0-100.</summary>
    public int Progress { get; set; }

    /// <summary>Position within its status column for Kanban ordering.</summary>
    public int BoardOrder { get; set; }

    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    /// <summary>Branch this ticket concerns (defaults from the reporter's branch).</summary>
    public int? BranchId { get; set; }
    public Branch? Branch { get; set; }

    /// <summary>Service category / technician group this ticket belongs to.</summary>
    public int? CategoryId { get; set; }
    public TicketCategory? Category { get; set; }

    public int? AssigneeId { get; set; }
    public User? Assignee { get; set; }

    public int? ReporterId { get; set; }
    public User? Reporter { get; set; }

    public int? ParentTaskId { get; set; }
    public WorkTask? ParentTask { get; set; }
    public ICollection<WorkTask> SubTasks { get; set; } = new List<WorkTask>();

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    public ICollection<TaskTag> TaskTags { get; set; } = new List<TaskTag>();
    public ICollection<ActivityLog> Activities { get; set; } = new List<ActivityLog>();
}
