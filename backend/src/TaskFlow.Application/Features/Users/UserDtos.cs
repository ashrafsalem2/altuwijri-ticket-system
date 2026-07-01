namespace TaskFlow.Application.Features.Users;

public record UserDto(
    int Id,
    string UserName,
    string Email,
    string FullName,
    string? JobTitle,
    int? DepartmentId,
    string? DepartmentName,
    string? PhoneNumber,
    string? AvatarColor,
    bool IsActive,
    bool IsAvailable,
    int RoleId,
    string RoleName,
    int? BranchId,
    string? BranchName,
    string? AreaName,
    List<int> CategoryIds,
    List<string> CategoryNames,
    List<int> BranchIds,
    List<string> BranchNames,
    List<int> IssuableCategoryIds,
    List<string> IssuableCategoryNames,
    DateTime? LastLoginAt,
    DateTime CreatedAt);

public record CreateUserRequest(
    string UserName,
    string Email,
    string FullName,
    string Password,
    int RoleId,
    int? BranchId,
    List<int>? CategoryIds,
    List<int>? BranchIds,
    List<int>? IssuableCategoryIds,
    string? JobTitle,
    int? DepartmentId,
    string? PhoneNumber);

public record UpdateUserRequest(
    string FullName,
    string Email,
    int RoleId,
    int? BranchId,
    List<int>? CategoryIds,
    List<int>? BranchIds,
    List<int>? IssuableCategoryIds,
    string? JobTitle,
    int? DepartmentId,
    string? PhoneNumber,
    bool IsActive);

public record RoleDto(int Id, string Name, string? Description);
