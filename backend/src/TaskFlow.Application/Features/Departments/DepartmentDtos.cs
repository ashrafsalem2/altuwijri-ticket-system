namespace TaskFlow.Application.Features.Departments;

public record DepartmentDto(int Id, string Name, string? Code, string? Description, int UserCount);

public record SaveDepartmentRequest(string Name, string? Code, string? Description);
