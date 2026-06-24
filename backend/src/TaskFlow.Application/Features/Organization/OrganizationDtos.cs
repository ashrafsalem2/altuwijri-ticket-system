namespace TaskFlow.Application.Features.Organization;

public record AreaDto(int Id, string Name, string Code, string? Description, int BranchCount);

public record BranchDto(
    int Id, string Name, string Code, string? Address, string? Phone,
    int AreaId, string AreaName, int UserCount);

public record CreateAreaRequest(string Name, string Code, string? Description);
public record UpdateAreaRequest(string Name, string? Description);

public record CreateBranchRequest(string Name, string Code, int AreaId, string? Address, string? Phone);
public record UpdateBranchRequest(string Name, int AreaId, string? Address, string? Phone);
