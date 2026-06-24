using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Common.Mapping;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Comments;

public interface ICommentService
{
    Task<IReadOnlyList<CommentDto>> GetForTaskAsync(int taskId, CancellationToken ct = default);
    Task<CommentDto> AddAsync(int taskId, CreateCommentRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class CommentService(IApplicationDbContext db, ICurrentUserService currentUser) : ICommentService
{
    public async Task<IReadOnlyList<CommentDto>> GetForTaskAsync(int taskId, CancellationToken ct = default)
    {
        var comments = await db.Comments.Include(c => c.Author).AsNoTracking()
            .Where(c => c.TaskId == taskId && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt).ToListAsync(ct);
        return comments.Select(c => c.ToDto()).ToList();
    }

    public async Task<CommentDto> AddAsync(int taskId, CreateCommentRequest request, CancellationToken ct = default)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && !t.IsDeleted, ct)
            ?? throw new NotFoundException("Task", taskId);
        if (string.IsNullOrWhiteSpace(request.Content))
            throw new BadRequestException("Comment cannot be empty.");

        var authorId = currentUser.UserId ?? throw new ForbiddenException();
        var comment = new Comment { TaskId = taskId, AuthorId = authorId, Content = request.Content.Trim() };
        db.Comments.Add(comment);

        // Notify assignee that a comment was added
        if (task.AssigneeId.HasValue && task.AssigneeId != authorId)
            db.Notifications.Add(new Notification
            {
                UserId = task.AssigneeId.Value,
                Type = NotificationType.TaskCommented,
                Title = "New comment",
                Message = $"New comment on '{task.Title}'",
                TaskId = taskId
            });

        await db.SaveChangesAsync(ct);
        return (await db.Comments.Include(c => c.Author).FirstAsync(c => c.Id == comment.Id, ct)).ToDto();
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new NotFoundException("Comment", id);
        if (comment.AuthorId != currentUser.UserId && currentUser.Role is not ("Admin" or "Manager"))
            throw new ForbiddenException("You can only delete your own comments.");
        comment.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }
}
