using TaskFlow.Domain.Common;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

/// <summary>A support conversation between a ticket issuer and a technician.</summary>
public class ChatConversation : BaseEntity
{
    public string Subject { get; set; } = string.Empty;
    public ChatStatus Status { get; set; } = ChatStatus.Open;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

    public int IssuerId { get; set; }
    public User Issuer { get; set; } = null!;

    public int? TechnicianId { get; set; }
    public User? Technician { get; set; }

    /// <summary>Optional task/ticket this conversation is about.</summary>
    public int? TaskId { get; set; }
    public WorkTask? Task { get; set; }

    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}

/// <summary>A single message within a conversation.</summary>
public class ChatMessage : BaseEntity
{
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; }

    public int ConversationId { get; set; }
    public ChatConversation Conversation { get; set; } = null!;

    public int SenderId { get; set; }
    public User Sender { get; set; } = null!;
}
