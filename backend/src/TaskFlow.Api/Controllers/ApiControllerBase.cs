using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Exceptions;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>The authenticated user's id, or throws if unauthenticated.</summary>
    protected int CurrentUserId
    {
        get
        {
            var value = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(value, out var id) ? id : throw new ForbiddenException("Not authenticated.");
        }
    }

    protected string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();
}
