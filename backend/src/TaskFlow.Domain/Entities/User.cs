using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

/// <summary>A member of the IT department who can be assigned work.</summary>
public class User : AuditableEntity
{
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public string? PhoneNumber { get; set; }

    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public string? AvatarColor { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Whether a technician is currently available for live chat/assignment.</summary>
    public bool IsAvailable { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;

    /// <summary>Branch the user (or ticket issuer) belongs to. Null for global/admin accounts.</summary>
    public int? BranchId { get; set; }
    public Branch? Branch { get; set; }

    /// <summary>For Technicians: the service groups/categories they handle (many-to-many).</summary>
    public ICollection<UserCategory> Categories { get; set; } = new List<UserCategory>();

    /// <summary>For Cam-Employee: all branches they belong to (many-to-many).</summary>
    public ICollection<UserBranch> Branches { get; set; } = new List<UserBranch>();

    /// <summary>Ticket categories this user is allowed to issue. Empty = no restriction (can issue any).</summary>
    public ICollection<UserIssuableCategory> IssuableCategories { get; set; } = new List<UserIssuableCategory>();

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<WorkTask> AssignedTasks { get; set; } = new List<WorkTask>();
    public ICollection<WorkTask> ReportedTasks { get; set; } = new List<WorkTask>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
