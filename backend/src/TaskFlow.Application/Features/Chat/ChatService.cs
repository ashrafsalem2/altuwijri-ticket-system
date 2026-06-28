using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Chat;

public interface IChatService
{
    Task<IReadOnlyList<AvailableTechnicianDto>> GetTechniciansAsync(bool onlyAvailable, CancellationToken ct = default);
    Task<IReadOnlyList<ConversationDto>> GetMyConversationsAsync(int userId, CancellationToken ct = default);
    Task<ConversationDto> StartAsync(int userId, StartConversationRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(int userId, int conversationId, CancellationToken ct = default);
    Task<ChatMessageDto> SendAsync(int userId, int conversationId, SendMessageRequest request, CancellationToken ct = default);
    Task CloseAsync(int userId, int conversationId, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default);
}

public class ChatService(IApplicationDbContext db) : IChatService
{
    public async Task<IReadOnlyList<AvailableTechnicianDto>> GetTechniciansAsync(bool onlyAvailable, CancellationToken ct = default)
    {
        var q = db.Users.Include(u => u.Role).Include(u => u.Branch).AsNoTracking()
            .Where(u => u.IsActive && (u.Role.Name == Roles.Technician || u.Role.Name == Roles.Admin));
        if (onlyAvailable) q = q.Where(u => u.IsAvailable);
        return await q.OrderByDescending(u => u.IsAvailable).ThenBy(u => u.FullName)
            .Select(u => new AvailableTechnicianDto(u.Id, u.FullName, u.JobTitle, u.AvatarColor, u.Branch!.Name, u.IsAvailable))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ConversationDto>> GetMyConversationsAsync(int userId, CancellationToken ct = default)
    {
        var convos = await db.ChatConversations
            .Include(c => c.Issuer).Include(c => c.Technician).Include(c => c.Task)
            .Include(c => c.Messages)
            .AsNoTracking()
            .Where(c => c.IssuerId == userId || c.TechnicianId == userId)
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync(ct);
        return convos.Select(c => ToDto(c, userId)).ToList();
    }

    public async Task<ConversationDto> StartAsync(int userId, StartConversationRequest request, CancellationToken ct = default)
    {
        if (request.TechnicianId == userId) throw new BadRequestException("You cannot start a chat with yourself.");
        if (!await db.Users.AnyAsync(u => u.Id == request.TechnicianId && u.IsActive, ct))
            throw new BadRequestException("Selected technician is not available.");

        var convo = new ChatConversation
        {
            IssuerId = userId,
            TechnicianId = request.TechnicianId,
            Subject = string.IsNullOrWhiteSpace(request.Subject) ? "Support chat" : request.Subject.Trim(),
            TaskId = request.TaskId
        };
        db.ChatConversations.Add(convo);
        await db.SaveChangesAsync(ct);

        db.Notifications.Add(new Notification
        {
            UserId = request.TechnicianId, Type = NotificationType.System,
            Title = "New support chat", Message = convo.Subject
        });
        await db.SaveChangesAsync(ct);

        return await GetConversationAsync(convo.Id, userId, ct);
    }

    public async Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(int userId, int conversationId, CancellationToken ct = default)
    {
        await EnsureParticipant(userId, conversationId, ct);
        var messages = await db.ChatMessages.Include(m => m.Sender).AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt).ToListAsync(ct);

        // mark incoming messages as read
        var unread = await db.ChatMessages
            .Where(m => m.ConversationId == conversationId && m.SenderId != userId && !m.IsRead).ToListAsync(ct);
        if (unread.Count > 0) { foreach (var m in unread) m.IsRead = true; await db.SaveChangesAsync(ct); }

        return messages.Select(m => new ChatMessageDto(
            m.Id, m.ConversationId, m.SenderId, m.Sender.FullName, m.Sender.AvatarColor,
            m.Content, m.CreatedAt, m.SenderId == userId)).ToList();
    }

    public async Task<ChatMessageDto> SendAsync(int userId, int conversationId, SendMessageRequest request, CancellationToken ct = default)
    {
        var convo = await EnsureParticipant(userId, conversationId, ct);
        if (string.IsNullOrWhiteSpace(request.Content)) throw new BadRequestException("Message cannot be empty.");

        var msg = new ChatMessage { ConversationId = conversationId, SenderId = userId, Content = request.Content.Trim() };
        db.ChatMessages.Add(msg);
        convo.LastMessageAt = DateTime.UtcNow;
        if (convo.Status == ChatStatus.Closed) convo.Status = ChatStatus.Open;
        await db.SaveChangesAsync(ct);

        var sender = await db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, ct);
        return new ChatMessageDto(msg.Id, conversationId, userId, sender.FullName, sender.AvatarColor,
            msg.Content, msg.CreatedAt, true);
    }

    public async Task CloseAsync(int userId, int conversationId, CancellationToken ct = default)
    {
        var convo = await EnsureParticipant(userId, conversationId, ct);
        convo.Status = ChatStatus.Closed;
        convo.ClosedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default) =>
        db.ChatMessages.CountAsync(m => m.SenderId != userId && !m.IsRead &&
            (m.Conversation.IssuerId == userId || m.Conversation.TechnicianId == userId), ct);

    private async Task<ChatConversation> EnsureParticipant(int userId, int conversationId, CancellationToken ct)
    {
        var convo = await db.ChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new NotFoundException("Conversation", conversationId);
        if (convo.IssuerId != userId && convo.TechnicianId != userId)
            throw new ForbiddenException("You are not a participant in this conversation.");
        return convo;
    }

    private async Task<ConversationDto> GetConversationAsync(int id, int userId, CancellationToken ct)
    {
        var c = await db.ChatConversations
            .Include(x => x.Issuer).Include(x => x.Technician).Include(x => x.Task).Include(x => x.Messages)
            .AsNoTracking().FirstAsync(x => x.Id == id, ct);
        return ToDto(c, userId);
    }

    private static ConversationDto ToDto(ChatConversation c, int userId)
    {
        var last = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
        var unread = c.Messages.Count(m => m.SenderId != userId && !m.IsRead);
        return new ConversationDto(
            c.Id, c.Subject, c.Status,
            c.IssuerId, c.Issuer.FullName, c.Issuer.AvatarColor,
            c.TechnicianId, c.Technician?.FullName, c.Technician?.AvatarColor,
            c.TaskId, c.Task?.Title,
            c.CreatedAt, c.LastMessageAt, last?.Content, unread);
    }
}
