using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

/// <summary>A branch (office/site) belonging to an area. Users and tickets are scoped to a branch.</summary>
public class Branch : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }

    public int AreaId { get; set; }
    public Area Area { get; set; } = null!;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
    public ICollection<Device> Devices { get; set; } = new List<Device>();
}
