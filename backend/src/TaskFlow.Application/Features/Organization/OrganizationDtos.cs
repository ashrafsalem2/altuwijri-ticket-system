namespace TaskFlow.Application.Features.Organization;

public record AreaDto(int Id, string Name, string Code, string? Description, int BranchCount);

public record DeviceDto(int Id, int BranchId, string Label, string AnyDeskNumber, string UserName, string Password, string? Notes);

public record BranchDto(
    int Id, string Name, string Code, string? Address, string? Phone, string? Email,
    int AreaId, string AreaName, int UserCount,
    IReadOnlyList<DeviceDto> Devices);

public record CreateAreaRequest(string Name, string Code, string? Description);
public record UpdateAreaRequest(string Name, string? Description);

public record CreateBranchRequest(string Name, string Code, int AreaId, string? Address, string? Phone, string? Email);
public record UpdateBranchRequest(string Name, int AreaId, string? Address, string? Phone, string? Email);

public record CreateDeviceRequest(int BranchId, string Label, string AnyDeskNumber, string UserName, string Password, string? Notes);
public record UpdateDeviceRequest(string Label, string AnyDeskNumber, string UserName, string Password, string? Notes);

// Branch/Device DTOs for employees (company requirement: password shown in plain text)
public record DevicePublicDto(int Id, string Label, string AnyDeskNumber, string UserName, string Password);
public record BranchPublicDto(int Id, string Name, string Code, string? Address, string? Phone, string? Email, string AreaName, IReadOnlyList<DevicePublicDto> Devices);
