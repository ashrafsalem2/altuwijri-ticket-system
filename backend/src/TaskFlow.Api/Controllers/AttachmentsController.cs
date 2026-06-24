using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Features.Attachments;

namespace TaskFlow.Api.Controllers;

/// <summary>File, image and URL attachments for tasks.</summary>
[Route("api/tasks/{taskId:int}/attachments")]
public class AttachmentsController(IAttachmentService attachments) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AttachmentDto>>> GetForTask(int taskId, CancellationToken ct)
        => Ok(await attachments.GetForTaskAsync(taskId, ct));

    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Technician},{Roles.Employee}")]
    [HttpPost("upload")]
    [RequestSizeLimit(26_214_400)] // 25 MB
    public async Task<ActionResult<AttachmentDto>> Upload(int taskId, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { title = "No file provided." });
        await using var stream = file.OpenReadStream();
        var dto = await attachments.UploadAsync(taskId,
            new UploadFile(file.FileName, file.ContentType ?? "application/octet-stream", stream, file.Length), ct);
        return Ok(dto);
    }

    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Technician},{Roles.Employee}")]
    [HttpPost("link")]
    public async Task<ActionResult<AttachmentDto>> AddLink(int taskId, AddLinkRequest request, CancellationToken ct)
        => Ok(await attachments.AddLinkAsync(taskId, request, ct));

    [HttpGet("{attachmentId:int}/download")]
    public async Task<IActionResult> Download(int taskId, int attachmentId, CancellationToken ct)
    {
        var f = await attachments.DownloadAsync(attachmentId, ct);
        return File(f.Content, f.ContentType, f.FileName);
    }

    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Technician},{Roles.Employee}")]
    [HttpDelete("{attachmentId:int}")]
    public async Task<IActionResult> Delete(int taskId, int attachmentId, CancellationToken ct)
    {
        await attachments.DeleteAsync(attachmentId, ct);
        return NoContent();
    }
}
