using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Features.Users;

namespace TaskFlow.Api.Controllers;

/// <summary>User and role administration.</summary>
public class UsersController(IUserService users) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll([FromQuery] bool includeInactive = false, CancellationToken ct = default)
        => Ok(await users.GetAllAsync(includeInactive, ct));

    [HttpGet("roles")]
    public async Task<ActionResult<IReadOnlyList<RoleDto>>> GetRoles(CancellationToken ct)
        => Ok(await users.GetRolesAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> Get(int id, CancellationToken ct)
        => Ok(await users.GetByIdAsync(id, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserRequest request, CancellationToken ct)
    {
        var created = await users.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, UpdateUserRequest request, CancellationToken ct)
        => Ok(await users.UpdateAsync(id, request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken ct)
    {
        await users.DeactivateAsync(id, ct);
        return NoContent();
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        await users.ResetPasswordAsync(id, request.NewPassword, ct);
        return NoContent();
    }

    /// <summary>Toggle the current user's availability for live chat/assignment.</summary>
    [HttpPost("me/availability")]
    public async Task<IActionResult> SetMyAvailability([FromBody] AvailabilityRequest request, CancellationToken ct)
    {
        await users.SetAvailabilityAsync(CurrentUserId, request.Available, ct);
        return NoContent();
    }
}

public record ResetPasswordRequest(string NewPassword);
public record AvailabilityRequest(bool Available);
