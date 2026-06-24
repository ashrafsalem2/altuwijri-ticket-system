using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Chat;

public record AvailableTechnicianDto(
    int Id, string FullName, string? JobTitle, string? AvatarColor, string? BranchName, bool IsAvailable);

public record ConversationDto(
    int Id, string Subject, ChatStatus Status,
    int IssuerId, string IssuerName, string? IssuerColor,
    int? TechnicianId, string? TechnicianName, string? TechnicianColor,
    int? TaskId, string? TaskTitle,
    DateTime CreatedAt, DateTime LastMessageAt,
    string? LastMessage, int UnreadCount);

public record ChatMessageDto(
    int Id, int ConversationId, int SenderId, string SenderName, string? SenderColor,
    string Content, DateTime CreatedAt, bool IsMine);

public record StartConversationRequest(int TechnicianId, string Subject, int? TaskId);
public record SendMessageRequest(string Content);
