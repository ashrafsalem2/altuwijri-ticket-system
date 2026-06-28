using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

public class AppLink : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Icon { get; set; } = "🔗";
    public string BgColor { get; set; } = "#2563eb";
    public string? ImageUrl { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Comma-separated role names. Empty = visible to all roles.</summary>
    public string AllowedRoles { get; set; } = "";
}
