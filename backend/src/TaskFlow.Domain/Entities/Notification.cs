using TaskFlow.Domain.Common;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

/// <summary>An in-app notification delivered to a user.</summary>
public class Notification : BaseEntity
{
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Optional task this notification refers to (for deep linking).</summary>
    public int? TaskId { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
