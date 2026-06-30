using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Models;
using TaskFlow.Application.Features.Comments;
using TaskFlow.Application.Features.Tasks;

namespace TaskFlow.Api.Controllers;

/// <summary>CRUD, filtering, Kanban board moves and comments for tasks.</summary>
public class TasksController(ITaskService tasks, ICommentService comments) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TaskListItemDto>>> Query([FromQuery] TaskQuery query, CancellationToken ct)
        => Ok(await tasks.QueryAsync(query, ct));

    [HttpGet("board")]
    public async Task<ActionResult<IReadOnlyList<TaskListItemDto>>> Board([FromQuery] int? projectId, CancellationToken ct)
        => Ok(await tasks.GetBoardAsync(projectId, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskDetailDto>> Get(int id, CancellationToken ct)
        => Ok(await tasks.GetByIdAsync(id, ct));

    [Authorize(Roles = Roles.AllRoles)]
    [HttpPost]
    public async Task<ActionResult<TaskDetailDto>> Create(CreateTaskRequest request, CancellationToken ct)
    {
        var created = await tasks.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [Authorize(Roles = Roles.AllStaff)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskDetailDto>> Update(int id, UpdateTaskRequest request, CancellationToken ct)
        => Ok(await tasks.UpdateAsync(id, request, ct));

    [Authorize(Roles = Roles.AllStaff)]
    [HttpPatch("{id:int}/move")]
    public async Task<IActionResult> Move(int id, MoveTaskRequest request, CancellationToken ct)
    {
        await tasks.MoveAsync(id, request, ct);
        return NoContent();
    }

    [Authorize(Roles = Roles.AllStaff)]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, SetTaskStatusRequest request, CancellationToken ct)
    {
        await tasks.SetStatusAsync(id, request.Status, ct);
        return NoContent();
    }

    [Authorize(Roles = Roles.AllStaff)]
    [HttpPost("{id:int}/claim")]
    public async Task<IActionResult> Claim(int id, CancellationToken ct)
    {
        await tasks.ClaimAsync(id, ct);
        return NoContent();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await tasks.DeleteAsync(id, ct);
        return NoContent();
    }

    // ----- Comments (nested under a task) -----

    [HttpGet("{id:int}/comments")]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> GetComments(int id, CancellationToken ct)
        => Ok(await comments.GetForTaskAsync(id, ct));

    [Authorize(Roles = Roles.AllRoles)]
    [HttpPost("{id:int}/comments")]
    public async Task<ActionResult<CommentDto>> AddComment(int id, CreateCommentRequest request, CancellationToken ct)
        => Ok(await comments.AddAsync(id, request, ct));

    [HttpDelete("comments/{commentId:int}")]
    public async Task<IActionResult> DeleteComment(int commentId, CancellationToken ct)
    {
        await comments.DeleteAsync(commentId, ct);
        return NoContent();
    }
}
