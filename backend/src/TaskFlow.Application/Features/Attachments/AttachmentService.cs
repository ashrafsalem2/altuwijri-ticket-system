using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Attachments;

public interface IAttachmentService
{
    Task<IReadOnlyList<AttachmentDto>> GetForTaskAsync(int taskId, CancellationToken ct = default);
    Task<AttachmentDto> UploadAsync(int taskId, UploadFile file, CancellationToken ct = default);
    Task<AttachmentDto> AddLinkAsync(int taskId, AddLinkRequest request, CancellationToken ct = default);
    Task<DownloadFile> DownloadAsync(int id, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class AttachmentService(IApplicationDbContext db, IFileStorage storage, ICurrentUserService currentUser)
    : IAttachmentService
{
    private const long MaxBytes = 25 * 1024 * 1024; // 25 MB
    private static readonly string[] ImageTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/svg+xml"];

    public async Task<IReadOnlyList<AttachmentDto>> GetForTaskAsync(int taskId, CancellationToken ct = default)
    {
        var items = await db.Attachments.AsNoTracking()
            .Where(a => a.TaskId == taskId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
        return items.Select(ToDto).ToList();
    }

    public async Task<AttachmentDto> UploadAsync(int taskId, UploadFile file, CancellationToken ct = default)
    {
        await EnsureTask(taskId, ct);
        if (file.Length <= 0) throw new BadRequestException("Empty file.");
        if (file.Length > MaxBytes) throw new BadRequestException("File exceeds the 25 MB limit.");

        var ext = Path.GetExtension(file.FileName);
        var stored = $"{Guid.NewGuid():N}{ext}";
        await storage.SaveAsync(file.Content, stored, ct);

        var kind = ImageTypes.Contains(file.ContentType?.ToLower()) ? AttachmentKind.Image : AttachmentKind.File;
        var entity = new Attachment
        {
            TaskId = taskId,
            Kind = kind,
            FileName = Path.GetFileName(file.FileName),
            StoredFileName = stored,
            ContentType = file.ContentType,
            SizeBytes = file.Length,
            CreatedById = currentUser.UserId
        };
        db.Attachments.Add(entity);
        await db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<AttachmentDto> AddLinkAsync(int taskId, AddLinkRequest request, CancellationToken ct = default)
    {
        await EnsureTask(taskId, ct);
        if (string.IsNullOrWhiteSpace(request.Url)) throw new BadRequestException("URL is required.");
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) || (uri.Scheme != "http" && uri.Scheme != "https"))
            throw new BadRequestException("Enter a valid http(s) URL.");

        var entity = new Attachment
        {
            TaskId = taskId,
            Kind = AttachmentKind.Link,
            FileName = string.IsNullOrWhiteSpace(request.Title) ? uri.Host : request.Title.Trim(),
            Url = request.Url.Trim(),
            CreatedById = currentUser.UserId
        };
        db.Attachments.Add(entity);
        await db.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task<DownloadFile> DownloadAsync(int id, CancellationToken ct = default)
    {
        var a = await db.Attachments.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct)
            ?? throw new NotFoundException("Attachment", id);
        if (a.Kind == AttachmentKind.Link || a.StoredFileName is null)
            throw new BadRequestException("This attachment is a link, not a file.");
        var stream = await storage.OpenAsync(a.StoredFileName, ct)
            ?? throw new NotFoundException("File", a.StoredFileName);
        return new DownloadFile(stream, a.ContentType ?? "application/octet-stream", a.FileName);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var a = await db.Attachments.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Attachment", id);
        a.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        if (a.StoredFileName is not null) storage.Delete(a.StoredFileName);
    }

    private async Task EnsureTask(int taskId, CancellationToken ct)
    {
        if (!await db.Tasks.AnyAsync(t => t.Id == taskId && !t.IsDeleted, ct))
            throw new NotFoundException("Task", taskId);
    }

    private static AttachmentDto ToDto(Attachment a) =>
        new(a.Id, a.Kind, a.FileName, a.ContentType, a.SizeBytes, a.Url, a.TaskId, a.CreatedAt);
}
