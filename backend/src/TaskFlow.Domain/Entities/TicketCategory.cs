using TaskFlow.Domain.Common;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

/// <summary>A service category that groups tickets and the technicians who handle them.</summary>
public class TicketCategory : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? NameAr { get; set; }
    public string? Description { get; set; }
    /// <summary>Emoji or short icon identifier, e.g. "🔧".</summary>
    public string Icon { get; set; } = "🎫";
    public string Color { get; set; } = "#3b82f6";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Ticket type automatically assigned when a user selects this category.</summary>
    public TaskType? DefaultType { get; set; }

    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
    public ICollection<UserCategory> UserCategories { get; set; } = new List<UserCategory>();
}
