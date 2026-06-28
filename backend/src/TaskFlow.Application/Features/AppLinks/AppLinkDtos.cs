namespace TaskFlow.Application.Features.AppLinks;

public record AppLinkDto(int Id, string Title, string Url, string Icon, string? ImageUrl, string BgColor, int DisplayOrder, bool IsActive, string AllowedRoles);
public record SaveAppLinkRequest(string Title, string Url, string Icon, string? ImageUrl, string BgColor, int DisplayOrder, bool IsActive, string AllowedRoles);
