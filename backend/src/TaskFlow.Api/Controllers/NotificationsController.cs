using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Features.Notifications;

namespace TaskFlow.Api.Controllers;

/// <summary>In-app notifications for the current user.</summary>
public class NotificationsController(INotificationService notifications) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> GetMine([FromQuery] bool unreadOnly = false, CancellationToken ct = default)
        => Ok(await notifications.GetMineAsync(CurrentUserId, unreadOnly, ct));

    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> UnreadCount(CancellationToken ct)
        => Ok(await notifications.GetUnreadCountAsync(CurrentUserId, ct));

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken ct)
    {
        await notifications.MarkReadAsync(CurrentUserId, id, ct);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await notifications.MarkAllReadAsync(CurrentUserId, ct);
        return NoContent();
    }
}
