using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

/// <summary>A reusable label that can be applied to tasks.</summary>
public class Tag : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#64748b";
    public string? Icon { get; set; }

    public ICollection<TaskTag> TaskTags { get; set; } = new List<TaskTag>();
}

/// <summary>Join entity for the many-to-many between tasks and tags.</summary>
public class TaskTag
{
    public int TaskId { get; set; }
    public WorkTask Task { get; set; } = null!;

    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
