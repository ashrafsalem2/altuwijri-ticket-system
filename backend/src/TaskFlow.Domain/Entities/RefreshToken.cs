using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

/// <summary>Persisted refresh token enabling token rotation and revocation.</summary>
public class RefreshToken : BaseEntity
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public string? CreatedByIp { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
