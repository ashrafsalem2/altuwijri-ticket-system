using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Attachments;

public record AttachmentDto(
    int Id,
    AttachmentKind Kind,
    string FileName,
    string? ContentType,
    long SizeBytes,
    string? Url,
    int TaskId,
    DateTime CreatedAt);

public record AddLinkRequest(string Title, string Url);

/// <summary>Carries an uploaded file's bytes into the service layer.</summary>
public record UploadFile(string FileName, string ContentType, Stream Content, long Length);

/// <summary>A file ready to be streamed back to the client.</summary>
public record DownloadFile(Stream Content, string ContentType, string FileName);
