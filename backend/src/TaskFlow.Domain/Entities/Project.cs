using TaskFlow.Domain.Common;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

/// <summary>A grouping of related tasks (e.g. an initiative, system, or service line).</summary>
public class Project : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#3b82f6";
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public int? LeadId { get; set; }
    public User? Lead { get; set; }

    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
}
