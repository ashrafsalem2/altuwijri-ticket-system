namespace TaskFlow.Application.Features.Auth;

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(LoginRequest request, string? ip, CancellationToken ct = default);
    Task<AuthResponse> RefreshAsync(RefreshRequest request, string? ip, CancellationToken ct = default);
    Task LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default);
    Task<AuthUserDto> GetCurrentAsync(int userId, CancellationToken ct = default);
}
