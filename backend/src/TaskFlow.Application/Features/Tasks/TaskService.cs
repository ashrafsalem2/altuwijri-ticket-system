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
    Task ClaimAsync(int id, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class TaskService(IApplicationDbContext db, ICurrentUserService currentUser, IEmailService emailService, IWhatsAppService whatsApp) : ITaskService
{
    private IQueryable<WorkTask> BaseQuery() => db.Tasks
        .Where(t => !t.IsDeleted)
        .Include(t => t.Project)
        .Include(t => t.Branch)
        .Include(t => t.Category)
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
        if (query.CategoryId.HasValue) q = q.Where(t => t.CategoryId == query.CategoryId);

        // Technicians see: their assigned tasks + unassigned tickets in their categories.
        // If no categories are assigned yet, show ALL unassigned tickets so nothing falls through.
        if (currentUser.Role == Roles.Technician && currentUser.UserId.HasValue)
        {
            var uid = currentUser.UserId.Value;
            var catIds = await db.UserCategories.Where(uc => uc.UserId == uid).Select(uc => uc.CategoryId).ToListAsync(ct);
            q = catIds.Count > 0
                ? q.Where(t => t.AssigneeId == uid || (t.CategoryId != null && catIds.Contains(t.CategoryId.Value) && t.AssigneeId == null))
                : q.Where(t => t.AssigneeId == uid || t.AssigneeId == null);
        }

        // Employee roles can only see tickets they submitted
        if (Roles.EmployeeRoles.Contains(currentUser.Role) && currentUser.UserId.HasValue)
            q = q.Where(t => t.ReporterId == currentUser.UserId.Value);

        q = (query.SortBy?.ToLower()) switch
        {
            "title" => query.SortDescending ? q.OrderByDescending(t => t.Title) : q.OrderBy(t => t.Title),
            "priority" => query.SortDescending ? q.OrderByDescending(t => t.Priority) : q.OrderBy(t => t.Priority),
            "status" => query.SortDescending ? q.OrderByDescending(t => t.Status) : q.OrderBy(t => t.Status),
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

        if (currentUser.Role == Roles.Technician && currentUser.UserId.HasValue)
        {
            var uid = currentUser.UserId.Value;
            var catIds = await db.UserCategories.Where(uc => uc.UserId == uid).Select(uc => uc.CategoryId).ToListAsync(ct);

            // Technician inbox spans ALL projects — unassigned tickets in their categories are
            // visible regardless of the project filter so nothing falls off the board.
            // The project filter still applies to tasks already assigned to the technician.
            if (catIds.Count > 0)
                q = q.Where(t =>
                    (t.AssigneeId == uid && (!projectId.HasValue || t.ProjectId == projectId))
                    || (t.CategoryId != null && catIds.Contains(t.CategoryId.Value) && t.AssigneeId == null));
            else
                // No category assignments: show their tasks (project-filtered) + ALL unassigned
                q = q.Where(t =>
                    (t.AssigneeId == uid && (!projectId.HasValue || t.ProjectId == projectId))
                    || t.AssigneeId == null);
        }
        else if (projectId.HasValue)
        {
            q = q.Where(t => t.ProjectId == projectId);
        }

        var items = await q.OrderBy(t => t.BoardOrder).ThenByDescending(t => t.CreatedAt).ToListAsync(ct);
        return items.Select(t => t.ToListItem()).ToList();
    }

    public async Task<TaskDetailDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var q = BaseQuery()
            .Include(t => t.Reporter)
            .Include(t => t.ParentTask)
            .AsNoTracking();

        // Employee roles can only view tickets they submitted
        if (Roles.EmployeeRoles.Contains(currentUser.Role) && currentUser.UserId.HasValue)
            q = q.Where(t => t.ReporterId == currentUser.UserId.Value);

        // Technicians can view tickets assigned to them or in their categories (unassigned or not).
        // No-category fallback: show all unassigned tickets so techs can always open what they see on the board.
        if (currentUser.Role == Roles.Technician && currentUser.UserId.HasValue)
        {
            var uid = currentUser.UserId.Value;
            var catIds = await db.UserCategories.Where(uc => uc.UserId == uid).Select(uc => uc.CategoryId).ToListAsync(ct);
            q = catIds.Count > 0
                ? q.Where(t => t.AssigneeId == uid || (t.CategoryId != null && catIds.Contains(t.CategoryId.Value)))
                : q.Where(t => t.AssigneeId == uid || t.AssigneeId == null);
        }

        var task = await q.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Task", id);
        return task.ToDetail();
    }

    public async Task<TaskDetailDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default)
    {
        // Employees don't pick a project — auto-assign the first active one.
        // Also accepts projectId=0 from any caller as "auto".
        int effectiveProjectId = request.ProjectId;
        if (effectiveProjectId <= 0 || Roles.EmployeeRoles.Contains(currentUser.Role))
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

        // Employee-submitted tickets are always ServiceRequest — the category tells you WHAT
        // the issue is about; the type is set by admin/technician when they assess it.
        var effectiveType = Roles.EmployeeRoles.Contains(currentUser.Role)
            ? TaskType.ServiceRequest
            : request.Type;

        var task = new WorkTask
        {
            Title = request.Title.Trim(),
            Description = request.Description,
            Status = request.Status,
            Priority = request.Priority,
            Type = effectiveType,
            ProjectId = effectiveProjectId,
            BranchId = branchId,
            CategoryId = request.CategoryId,
            AssigneeId = request.AssigneeId,
            ReporterId = currentUser.UserId,
            ParentTaskId = request.ParentTaskId,
            BoardOrder = maxOrder + 1,
            CreatedById = currentUser.UserId
        };

        // Auto-set StartDate when created directly as InProgress
        if (request.Status == WorkTaskStatus.InProgress)
            task.StartDate = DateTime.UtcNow;

        if (request.TagIds is { Count: > 0 })
            foreach (var tagId in request.TagIds.Distinct())
                task.TaskTags.Add(new TaskTag { TagId = tagId });

        if (request.AssigneeId.HasValue)
            await ValidateAssigneeCategoryAsync(request.AssigneeId.Value, request.CategoryId, ct);

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

        if (request.AssigneeId.HasValue)
            await ValidateAssigneeCategoryAsync(request.AssigneeId.Value, request.CategoryId, ct);

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
        task.CategoryId = request.CategoryId;
        task.AssigneeId = request.AssigneeId;
        task.Progress = Math.Clamp(request.Progress, 0, 100);
        task.UpdatedAt = DateTime.UtcNow;
        task.UpdatedById = currentUser.UserId;

        // Auto-set StartDate when first entering InProgress
        if (request.Status == WorkTaskStatus.InProgress && task.StartDate == null)
            task.StartDate = DateTime.UtcNow;

        if (request.Status == WorkTaskStatus.Done)
            task.CompletedAt ??= DateTime.UtcNow;
        else
            task.CompletedAt = null;

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

        if (request.Status == WorkTaskStatus.InProgress && task.StartDate == null)
            task.StartDate = DateTime.UtcNow;

        if (request.Status == WorkTaskStatus.Done)
            task.CompletedAt ??= DateTime.UtcNow;
        else
            task.CompletedAt = null;

        await db.SaveChangesAsync(ct);
    }

    /// <summary>Blocks assigning a ticket to a technician whose configured categories don't include the ticket's category.</summary>
    private async Task ValidateAssigneeCategoryAsync(int assigneeId, int? categoryId, CancellationToken ct)
    {
        if (!categoryId.HasValue) return;

        var assignee = await db.Users.AsNoTracking()
            .Where(u => u.Id == assigneeId)
            .Select(u => new { u.FullName, RoleName = u.Role.Name })
            .FirstOrDefaultAsync(ct)
            ?? throw new BadRequestException("Selected assignee does not exist.");

        if (assignee.RoleName != Roles.Technician) return;

        var techCatIds = await db.UserCategories.Where(uc => uc.UserId == assigneeId).Select(uc => uc.CategoryId).ToListAsync(ct);
        if (techCatIds.Count == 0 || techCatIds.Contains(categoryId.Value)) return;

        var catName = await db.TicketCategories.AsNoTracking()
            .Where(c => c.Id == categoryId.Value).Select(c => c.Name).FirstOrDefaultAsync(ct);
        throw new BadRequestException($"{assignee.FullName} does not handle the '{catName}' category. Choose a technician assigned to this category.");
    }

    public async Task ClaimAsync(int id, CancellationToken ct = default)
    {
        if (!currentUser.UserId.HasValue)
            throw new BadRequestException("Not authenticated.");

        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct)
            ?? throw new NotFoundException("Task", id);

        var uid = currentUser.UserId.Value;

        if (task.AssigneeId.HasValue && task.AssigneeId.Value != uid)
            throw new BadRequestException("This ticket is already claimed by someone.");

        // Technicians can only claim tickets in their categories
        if (currentUser.Role == Roles.Technician)
        {
            var techCatIds = await db.UserCategories.Where(uc => uc.UserId == uid).Select(uc => uc.CategoryId).ToListAsync(ct);
            if (task.CategoryId.HasValue && techCatIds.Count > 0 && !techCatIds.Contains(task.CategoryId.Value))
                throw new BadRequestException("This ticket does not belong to your category.");
        }

        task.AssigneeId = uid;
        task.Status = WorkTaskStatus.InProgress;
        task.StartDate ??= DateTime.UtcNow;
        task.ClaimedAt ??= DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;
        task.UpdatedById = uid;

        LogActivity(id, "claimed", "Assignee", null, uid.ToString());
        await db.SaveChangesAsync(ct);
        await NotifyAsync(uid, NotificationType.TaskAssigned, "You accepted a ticket", task.Title, id, ct);
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

        var phone = !string.IsNullOrWhiteSpace(user.PhoneNumber)
            ? user.PhoneNumber
            : null;

        await whatsApp.SendTaskAssignedAsync(phone ?? "", user.FullName, message, taskId, priority, project, ct);
    }
}
