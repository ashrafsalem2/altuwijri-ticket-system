using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Common.Mapping;
using TaskFlow.Application.Common.Models;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.Tasks;

public interface ITaskService
{
    Task<PagedResult<TaskListItemDto>> QueryAsync(TaskQuery query, CancellationToken ct = default);
    Task<IReadOnlyList<TaskListItemDto>> GetBoardAsync(int? projectId, CancellationToken ct = default);
    Task<TaskDetailDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<TaskDetailDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default);
    Task<TaskDetailDto> UpdateAsync(int id, UpdateTaskRequest request, CancellationToken ct = default);
    Task MoveAsync(int id, MoveTaskRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class TaskService(IApplicationDbContext db, ICurrentUserService currentUser, IEmailService emailService, IWhatsAppService whatsApp) : ITaskService
{
    private IQueryable<WorkTask> BaseQuery() => db.Tasks
        .Where(t => !t.IsDeleted)
        .Include(t => t.Project)
        .Include(t => t.Branch)
        .Include(t => t.Assignee)
        .Include(t => t.SubTasks)
        .Include(t => t.Comments)
        .Include(t => t.TaskTags).ThenInclude(tt => tt.Tag);

    public async Task<PagedResult<TaskListItemDto>> QueryAsync(TaskQuery query, CancellationToken ct = default)
    {
        var q = BaseQuery().AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(t => t.Title.ToLower().Contains(s) ||
                             (t.Description != null && t.Description.ToLower().Contains(s)));
        }
        if (query.Status.HasValue) q = q.Where(t => t.Status == query.Status);
        if (query.Statuses != null && query.Statuses.Count > 0) q = q.Where(t => query.Statuses.Contains(t.Status));
        if (query.Priority.HasValue) q = q.Where(t => t.Priority == query.Priority);
        if (query.Type.HasValue) q = q.Where(t => t.Type == query.Type);
        if (query.ProjectId.HasValue) q = q.Where(t => t.ProjectId == query.ProjectId);
        if (query.BranchId.HasValue) q = q.Where(t => t.BranchId == query.BranchId);
        if (query.AssigneeId.HasValue) q = q.Where(t => t.AssigneeId == query.AssigneeId);
        if (query.Overdue == true)
            q = q.Where(t => t.DueDate != null && t.DueDate < DateTime.UtcNow &&
                             t.Status != WorkTaskStatus.Done && t.Status != WorkTaskStatus.Cancelled);

        // Technicians only see tasks assigned to them
        if (currentUser.Role == Roles.Technician && currentUser.UserId.HasValue)
            q = q.Where(t => t.AssigneeId == currentUser.UserId.Value);

        // Employees can only see tickets they submitted
        if (currentUser.Role == Roles.Employee && currentUser.UserId.HasValue)
            q = q.Where(t => t.ReporterId == currentUser.UserId.Value);

        q = (query.SortBy?.ToLower()) switch
        {
            "title" => query.SortDescending ? q.OrderByDescending(t => t.Title) : q.OrderBy(t => t.Title),
            "priority" => query.SortDescending ? q.OrderByDescending(t => t.Priority) : q.OrderBy(t => t.Priority),
            "status" => query.SortDescending ? q.OrderByDescending(t => t.Status) : q.OrderBy(t => t.Status),
            "duedate" => query.SortDescending ? q.OrderByDescending(t => t.DueDate) : q.OrderBy(t => t.DueDate),
            _ => query.SortDescending ? q.OrderByDescending(t => t.CreatedAt) : q.OrderBy(t => t.CreatedAt)
        };

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, query.Page);
        var size = Math.Clamp(query.PageSize, 1, 100);
        var items = await q.Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return new PagedResult<TaskListItemDto>(items.Select(t => t.ToListItem()).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<TaskListItemDto>> GetBoardAsync(int? projectId, CancellationToken ct = default)
    {
        var q = BaseQuery().AsNoTracking().Where(t => t.ParentTaskId == null);
        if (projectId.HasValue) q = q.Where(t => t.ProjectId == projectId);
        if (currentUser.Role == Roles.Technician && currentUser.UserId.HasValue)
            q = q.Where(t => t.AssigneeId == currentUser.UserId.Value);
        var items = await q.OrderBy(t => t.BoardOrder).ThenByDescending(t => t.CreatedAt).ToListAsync(ct);
        return items.Select(t => t.ToListItem()).ToList();
    }

    public async Task<TaskDetailDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var q = BaseQuery()
            .Include(t => t.Reporter)
            .Include(t => t.ParentTask)
            .AsNoTracking();

        // Employees can only view tickets they submitted
        if (currentUser.Role == Roles.Employee && currentUser.UserId.HasValue)
            q = q.Where(t => t.ReporterId == currentUser.UserId.Value);

        var task = await q.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Task", id);
        return task.ToDetail();
    }

    public async Task<TaskDetailDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default)
    {
        // Employees don't pick a project — auto-assign the first active one.
        // Also accepts projectId=0 from any caller as "auto".
        int effectiveProjectId = request.ProjectId;
        if (effectiveProjectId <= 0 || currentUser.Role == Roles.Employee)
        {
            var projValid = effectiveProjectId > 0 &&
                            await db.Projects.AnyAsync(p => p.Id == effectiveProjectId && !p.IsDeleted, ct);
            if (!projValid)
                effectiveProjectId = await db.Projects
                    .Where(p => !p.IsDeleted && p.Status == ProjectStatus.Active)
                    .OrderBy(p => p.Id).Select(p => p.Id).FirstOrDefaultAsync(ct);
            if (effectiveProjectId == 0)
                throw new BadRequestException("No active project is available to accept this ticket.");
        }
        else if (!await db.Projects.AnyAsync(p => p.Id == effectiveProjectId && !p.IsDeleted, ct))
            throw new BadRequestException("Specified project does not exist.");

        var maxOrder = await db.Tasks
            .Where(t => t.Status == request.Status && t.ProjectId == effectiveProjectId)
            .Select(t => (int?)t.BoardOrder).MaxAsync(ct) ?? 0;

        // Default the branch from the reporter (ticket issuer) when not supplied.
        var branchId = request.BranchId;
        if (branchId is null && currentUser.UserId is int uid)
            branchId = await db.Users.Where(u => u.Id == uid).Select(u => u.BranchId).FirstOrDefaultAsync(ct);

        var task = new WorkTask
        {
            Title = request.Title.Trim(),
            Description = request.Description,
            Status = request.Status,
            Priority = request.Priority,
            Type = currentUser.Role == Roles.Employee ? TaskType.ServiceRequest : request.Type,
            ProjectId = effectiveProjectId,
            BranchId = branchId,
            AssigneeId = request.AssigneeId,
            ReporterId = currentUser.UserId,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            SlaDueDate = request.SlaDueDate,
            EstimatedHours = request.EstimatedHours,
            ParentTaskId = request.ParentTaskId,
            BoardOrder = maxOrder + 1,
            CreatedById = currentUser.UserId
        };

        if (request.TagIds is { Count: > 0 })
            foreach (var tagId in request.TagIds.Distinct())
                task.TaskTags.Add(new TaskTag { TagId = tagId });

        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);

        LogActivity(task.Id, "created", null, null, task.Title);
        if (task.AssigneeId.HasValue)
            await NotifyAsync(task.AssigneeId.Value, NotificationType.TaskAssigned,
                "Task assigned to you", task.Title, task.Id, ct);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(task.Id, ct);
    }

    public async Task<TaskDetailDto> UpdateAsync(int id, UpdateTaskRequest request, CancellationToken ct = default)
    {
        var task = await db.Tasks.Include(t => t.TaskTags)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct)
            ?? throw new NotFoundException("Task", id);

        // Technicians cannot close tickets — only Admin/Manager can mark Done or Cancelled
        if (currentUser.Role == Roles.Technician &&
            (request.Status == WorkTaskStatus.Done || request.Status == WorkTaskStatus.Cancelled))
            throw new BadRequestException("Technicians cannot close tickets. Set status to 'In Review' to request manager approval.");

        // Due date must not be before the ticket's creation date
        if (request.DueDate.HasValue && request.DueDate.Value.Date < task.CreatedAt.Date)
            throw new BadRequestException("Due date cannot be earlier than the ticket creation date.");
        if (request.SlaDueDate.HasValue && request.DueDate.HasValue && request.SlaDueDate.Value.Date < request.DueDate.Value.Date)
            throw new BadRequestException("SLA due date cannot be earlier than the due date.");

        if (task.Status != request.Status)
            LogActivity(id, "status changed", "Status", task.Status.ToString(), request.Status.ToString());
        if (task.AssigneeId != request.AssigneeId && request.AssigneeId.HasValue)
            await NotifyAsync(request.AssigneeId.Value, NotificationType.TaskAssigned,
                "Task assigned to you", request.Title, id, ct);

        task.Title = request.Title.Trim();
        task.Description = request.Description;
        task.Status = request.Status;
        task.Priority = request.Priority;
        task.Type = request.Type;
        task.ProjectId = request.ProjectId;
        task.BranchId = request.BranchId;
        task.AssigneeId = request.AssigneeId;
        task.StartDate = request.StartDate;
        task.DueDate = request.DueDate;
        task.SlaDueDate = request.SlaDueDate;
        task.EstimatedHours = request.EstimatedHours;
        task.ActualHours = request.ActualHours;
        task.Progress = Math.Clamp(request.Progress, 0, 100);
        task.UpdatedAt = DateTime.UtcNow;
        task.UpdatedById = currentUser.UserId;

        if (request.Status == WorkTaskStatus.Done)
        {
            task.CompletedAt ??= DateTime.UtcNow;
            task.Progress = 100;
        }
        else
        {
            task.CompletedAt = null;
        }

        // Re-sync tags
        if (request.TagIds is not null)
        {
            task.TaskTags.Clear();
            foreach (var tagId in request.TagIds.Distinct())
                task.TaskTags.Add(new TaskTag { TagId = tagId });
        }

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task MoveAsync(int id, MoveTaskRequest request, CancellationToken ct = default)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct)
            ?? throw new NotFoundException("Task", id);

        if (task.Status != request.Status)
            LogActivity(id, "moved", "Status", task.Status.ToString(), request.Status.ToString());

        task.Status = request.Status;
        task.BoardOrder = request.BoardOrder;
        task.UpdatedAt = DateTime.UtcNow;
        task.UpdatedById = currentUser.UserId;
        if (request.Status == WorkTaskStatus.Done) { task.CompletedAt ??= DateTime.UtcNow; task.Progress = 100; }
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct)
            ?? throw new NotFoundException("Task", id);
        task.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    private void LogActivity(int taskId, string action, string? field, string? oldValue, string? newValue) =>
        db.ActivityLogs.Add(new ActivityLog
        {
            TaskId = taskId,
            Action = action,
            Field = field,
            OldValue = oldValue,
            NewValue = newValue,
            UserId = currentUser.UserId
        });

    private async Task NotifyAsync(int userId, NotificationType type, string title, string message, int taskId, CancellationToken ct)
    {
        if (userId == currentUser.UserId) return;
        db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            TaskId = taskId
        });

        var user = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Email, u.FullName, u.PhoneNumber })
            .FirstOrDefaultAsync(ct);

        if (user is null) return;

        var taskInfo = await db.Tasks.AsNoTracking()
            .Where(t => t.Id == taskId)
            .Select(t => new { t.Priority, ProjectName = t.Project != null ? t.Project.Name : "" })
            .FirstOrDefaultAsync(ct);

        var priority = taskInfo?.Priority.ToString() ?? "";
        var project  = taskInfo?.ProjectName ?? "";

        if (!string.IsNullOrWhiteSpace(user.Email))
            await emailService.SendTaskAssignedAsync(user.Email, user.FullName, message, taskId, priority, project, ct);

        // Use the user's stored phone; fall back to the configured fallback number
        var phone = !string.IsNullOrWhiteSpace(user.PhoneNumber)
            ? user.PhoneNumber
            : null; // WhatsAppService reads FallbackPhone from config when toPhone is empty

        await whatsApp.SendTaskAssignedAsync(phone ?? "", user.FullName, message, taskId, priority, project, ct);
    }
}
