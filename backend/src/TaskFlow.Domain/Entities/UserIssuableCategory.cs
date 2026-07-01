namespace TaskFlow.Domain.Entities;

/// <summary>Join entity: the ticket categories a user (employee) is allowed to issue tickets in.</summary>
public class UserIssuableCategory
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int CategoryId { get; set; }
    public TicketCategory Category { get; set; } = null!;
}
