using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Common.Mapping;

namespace TaskFlow.Application.Features.Notifications;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationDto>> GetMineAsync(int userId, bool unreadOnly, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default);
    Task MarkReadAsync(int userId, int notificationId, CancellationToken ct = default);
    Task MarkAllReadAsync(int userId, CancellationToken ct = default);
}

public class NotificationService(IApplicationDbContext db) : INotificationService
{
    public async Task<IReadOnlyList<NotificationDto>> GetMineAsync(int userId, bool unreadOnly, CancellationToken ct = default)
    {
        var q = db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly) q = q.Where(n => !n.IsRead);
        var list = await q.OrderByDescending(n => n.CreatedAt).Take(50).ToListAsync(ct);
        return list.Select(n => n.ToDto()).ToList();
    }

    public Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default) =>
        db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

    public async Task MarkReadAsync(int userId, int notificationId, CancellationToken ct = default)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId, ct);
        if (n is { IsRead: false }) { n.IsRead = true; await db.SaveChangesAsync(ct); }
    }

    public async Task MarkAllReadAsync(int userId, CancellationToken ct = default)
    {
        var unread = await db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync(ct);
        foreach (var n in unread) n.IsRead = true;
        await db.SaveChangesAsync(ct);
    }
}
