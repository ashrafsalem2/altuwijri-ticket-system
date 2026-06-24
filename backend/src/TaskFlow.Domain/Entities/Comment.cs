using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

/// <summary>A discussion entry attached to a task.</summary>
public class Comment : AuditableEntity
{
    public string Content { get; set; } = string.Empty;

    public int TaskId { get; set; }
    public WorkTask Task { get; set; } = null!;

    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;
}
