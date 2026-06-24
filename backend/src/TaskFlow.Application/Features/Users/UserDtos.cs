namespace TaskFlow.Application.Features.Users;

public record UserDto(
    int Id,
    string UserName,
    string Email,
    string FullName,
    string? JobTitle,
    string? Department,
    string? PhoneNumber,
    string? AvatarColor,
    bool IsActive,
    bool IsAvailable,
    int RoleId,
    string RoleName,
    int? BranchId,
    string? BranchName,
    string? AreaName,
    DateTime? LastLoginAt,
    DateTime CreatedAt);

public record CreateUserRequest(
    string UserName,
    string Email,
    string FullName,
    string Password,
    int RoleId,
    int? BranchId,
    string? JobTitle,
    string? Department,
    string? PhoneNumber);

public record UpdateUserRequest(
    string FullName,
    string Email,
    int RoleId,
    int? BranchId,
    string? JobTitle,
    string? Department,
    string? PhoneNumber,
    bool IsActive);

public record RoleDto(int Id, string Name, string? Description);
