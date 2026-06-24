using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

/// <summary>Application role used for authorization (Admin, Manager, Technician, Viewer).</summary>
public class Role : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
}
