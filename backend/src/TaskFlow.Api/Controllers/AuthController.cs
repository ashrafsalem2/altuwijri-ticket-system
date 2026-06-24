using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Features.Auth;

namespace TaskFlow.Api.Controllers;

/// <summary>Authentication: login, token refresh, logout, profile and password.</summary>
public class AuthController(IAuthService auth) : ApiControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
        => Ok(await auth.LoginAsync(request, ClientIp, ct));

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct)
        => Ok(await auth.RefreshAsync(request, ClientIp, ct));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken ct)
    {
        await auth.LogoutAsync(request.RefreshToken, ct);
        return NoContent();
    }

    [HttpGet("me")]
    public async Task<ActionResult<AuthUserDto>> Me(CancellationToken ct)
        => Ok(await auth.GetCurrentAsync(CurrentUserId, ct));

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await auth.ChangePasswordAsync(CurrentUserId, request, ct);
        return NoContent();
    }
}

public record LogoutRequest(string RefreshToken);
