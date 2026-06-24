namespace TaskFlow.Application.Features.Auth;

public record LoginRequest(string UserNameOrEmail, string Password);

public record RefreshRequest(string AccessToken, string RefreshToken);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    AuthUserDto User);

public record AuthUserDto(
    int Id,
    string UserName,
    string FullName,
    string Email,
    string Role,
    string? AvatarColor,
    string? JobTitle,
    int? BranchId,
    string? BranchName,
    bool IsAvailable);
