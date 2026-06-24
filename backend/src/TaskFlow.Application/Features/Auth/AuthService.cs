using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Features.Auth;

public class AuthService(
    IApplicationDbContext db,
    IPasswordHasher passwordHasher,
    ITokenService tokenService) : IAuthService
{
    private const int RefreshTokenDays = 7;

    public async Task<AuthResponse> LoginAsync(LoginRequest request, string? ip, CancellationToken ct = default)
    {
        var key = request.UserNameOrEmail.Trim().ToLower();
        var user = await db.Users.Include(u => u.Role).Include(u => u.Branch)
            .FirstOrDefaultAsync(u => u.UserName.ToLower() == key || u.Email.ToLower() == key, ct);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new BadRequestException("Invalid credentials.");

        if (!user.IsActive)
            throw new ForbiddenException("This account has been deactivated.");

        user.LastLoginAt = DateTime.UtcNow;
        var response = await IssueTokensAsync(user, ip, ct);
        await db.SaveChangesAsync(ct);
        return response;
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, string? ip, CancellationToken ct = default)
    {
        var principal = tokenService.GetPrincipalFromExpiredToken(request.AccessToken)
            ?? throw new BadRequestException("Invalid access token.");

        var userIdClaim = principal.FindFirst("sub")?.Value
            ?? principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            throw new BadRequestException("Invalid access token.");

        var user = await db.Users.Include(u => u.Role).Include(u => u.Branch).Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new BadRequestException("Invalid access token.");

        var stored = user.RefreshTokens.FirstOrDefault(t => t.Token == request.RefreshToken);
        if (stored is null || !stored.IsActive)
            throw new BadRequestException("Invalid or expired refresh token.");

        stored.RevokedAt = DateTime.UtcNow;
        var response = await IssueTokensAsync(user, ip, ct);
        await db.SaveChangesAsync(ct);
        return response;
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken, ct);
        if (stored is not null && stored.RevokedAt is null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User", userId);

        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new BadRequestException("Current password is incorrect.");

        if (request.NewPassword.Length < 6)
            throw new BadRequestException("New password must be at least 6 characters.");

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        await db.SaveChangesAsync(ct);
    }

    public async Task<AuthUserDto> GetCurrentAsync(int userId, CancellationToken ct = default)
    {
        var user = await db.Users.Include(u => u.Role).Include(u => u.Branch)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User", userId);
        return ToAuthUser(user);
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, string? ip, CancellationToken ct)
    {
        var (accessToken, expiresAt) = tokenService.CreateAccessToken(user);
        var refreshToken = tokenService.CreateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            Token = refreshToken,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays),
            CreatedByIp = ip
        });

        await Task.CompletedTask;
        return new AuthResponse(accessToken, refreshToken, expiresAt, ToAuthUser(user));
    }

    private static AuthUserDto ToAuthUser(User u) =>
        new(u.Id, u.UserName, u.FullName, u.Email, u.Role.Name, u.AvatarColor, u.JobTitle,
            u.BranchId, u.Branch?.Name, u.IsAvailable);
}
