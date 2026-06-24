using System.Security.Claims;
using TaskFlow.Application.Common.Interfaces;

namespace TaskFlow.Api.Services;

/// <summary>Reads identity information from the current HTTP request's claims.</summary>
public class CurrentUserService(IHttpContextAccessor accessor) : ICurrentUserService
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public int? UserId
    {
        get
        {
            var value = Principal?.FindFirst("sub")?.Value
                        ?? Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public string? UserName => Principal?.FindFirst(ClaimTypes.Name)?.Value;
    public string? Role => Principal?.FindFirst(ClaimTypes.Role)?.Value;
    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;
}
