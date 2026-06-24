using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Features.Chat;

namespace TaskFlow.Api.Controllers;

/// <summary>Live support chat between ticket issuers and technicians.</summary>
public class ChatController(IChatService chat) : ApiControllerBase
{
    [HttpGet("technicians")]
    public async Task<ActionResult<IReadOnlyList<AvailableTechnicianDto>>> Technicians([FromQuery] bool onlyAvailable = true, CancellationToken ct = default)
        => Ok(await chat.GetTechniciansAsync(onlyAvailable, ct));

    [HttpGet("conversations")]
    public async Task<ActionResult<IReadOnlyList<ConversationDto>>> Conversations(CancellationToken ct)
        => Ok(await chat.GetMyConversationsAsync(CurrentUserId, ct));

    [HttpPost("conversations")]
    public async Task<ActionResult<ConversationDto>> Start(StartConversationRequest request, CancellationToken ct)
        => Ok(await chat.StartAsync(CurrentUserId, request, ct));

    [HttpGet("conversations/{id:int}/messages")]
    public async Task<ActionResult<IReadOnlyList<ChatMessageDto>>> Messages(int id, CancellationToken ct)
        => Ok(await chat.GetMessagesAsync(CurrentUserId, id, ct));

    [HttpPost("conversations/{id:int}/messages")]
    public async Task<ActionResult<ChatMessageDto>> Send(int id, SendMessageRequest request, CancellationToken ct)
        => Ok(await chat.SendAsync(CurrentUserId, id, request, ct));

    [HttpPost("conversations/{id:int}/close")]
    public async Task<IActionResult> Close(int id, CancellationToken ct) { await chat.CloseAsync(CurrentUserId, id, ct); return NoContent(); }

    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> Unread(CancellationToken ct) => Ok(await chat.GetUnreadCountAsync(CurrentUserId, ct));
}
