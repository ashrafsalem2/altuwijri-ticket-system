namespace TaskFlow.Domain.Entities;

/// <summary>Junction table for Cam-Employee multi-branch membership.</summary>
public class UserBranch
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
}
