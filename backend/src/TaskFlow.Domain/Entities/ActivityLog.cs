using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

/// <summary>An immutable audit entry describing a change made to a task.</summary>
public class ActivityLog : BaseEntity
{
    public string Action { get; set; } = string.Empty;
    public string? Field { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int TaskId { get; set; }
    public WorkTask Task { get; set; } = null!;

    public int? UserId { get; set; }
    public User? User { get; set; }
}
