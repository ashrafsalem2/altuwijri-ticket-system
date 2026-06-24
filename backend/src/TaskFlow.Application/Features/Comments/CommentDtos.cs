namespace TaskFlow.Application.Features.Comments;

public record CommentDto(
    int Id,
    string Content,
    int TaskId,
    int AuthorId,
    string AuthorName,
    string? AuthorColor,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record CreateCommentRequest(string Content);
