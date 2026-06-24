using TaskFlow.Domain.Common;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

/// <summary>A file, image, or external URL linked to a task.</summary>
public class Attachment : AuditableEntity
{
    public AttachmentKind Kind { get; set; } = AttachmentKind.File;

    /// <summary>Display name (file name, or a title for a link).</summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>Physical stored file name (null for link attachments).</summary>
    public string? StoredFileName { get; set; }
    public string? ContentType { get; set; }
    public long SizeBytes { get; set; }

    /// <summary>External URL (only for <see cref="AttachmentKind.Link"/>).</summary>
    public string? Url { get; set; }

    public int TaskId { get; set; }
    public WorkTask Task { get; set; } = null!;
}
