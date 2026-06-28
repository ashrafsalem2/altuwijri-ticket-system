using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

public class Device : AuditableEntity
{
    public string Label { get; set; } = string.Empty;
    public string AnyDeskNumber { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Notes { get; set; }

    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
}
