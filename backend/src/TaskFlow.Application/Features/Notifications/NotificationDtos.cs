using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Notifications;

public record NotificationDto(
    int Id,
    NotificationType Type,
    string Title,
    string Message,
    bool IsRead,
    int? TaskId,
    DateTime CreatedAt);
