namespace TaskFlow.Domain.Entities;

/// <summary>Join entity: a technician belongs to one or more ticket categories (service groups).</summary>
public class UserCategory
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int CategoryId { get; set; }
    public TicketCategory Category { get; set; } = null!;
}
