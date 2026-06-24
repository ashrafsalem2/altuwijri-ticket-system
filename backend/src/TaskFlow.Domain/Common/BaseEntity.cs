namespace TaskFlow.Domain.Common;

/// <summary>
/// Base type for all persistent entities.
/// </summary>
public abstract class BaseEntity
{
    public int Id { get; set; }
}

/// <summary>
/// Entity that tracks creation/modification metadata and supports soft delete.
/// </summary>
public abstract class AuditableEntity : BaseEntity
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? CreatedById { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedById { get; set; }
    public bool IsDeleted { get; set; }
}
