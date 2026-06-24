using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

/// <summary>A geographic/organizational area that groups one or more branches.</summary>
public class Area : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
}
