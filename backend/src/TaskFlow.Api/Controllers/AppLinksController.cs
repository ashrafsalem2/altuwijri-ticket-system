using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Features.AppLinks;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Api.Controllers;

[Route("api/app-links")]
public class AppLinksController(IApplicationDbContext db) : ApiControllerBase
{
    static AppLinkDto Map(AppLink l) =>
        new(l.Id, l.Title, l.Url, l.Icon, l.ImageUrl, l.BgColor, l.DisplayOrder, l.IsActive, l.AllowedRoles);

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AppLinkDto>>> GetAll(CancellationToken ct)
    {
        var links = await db.AppLinks
            .Where(l => !l.IsDeleted)
            .OrderBy(l => l.DisplayOrder).ThenBy(l => l.Title)
            .ToListAsync(ct);
        return Ok(links.Select(Map).ToList());
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<AppLinkDto>> Create(SaveAppLinkRequest req, CancellationToken ct)
    {
        var link = Apply(new AppLink(), req);
        db.AppLinks.Add(link);
        await db.SaveChangesAsync(ct);
        return Ok(Map(link));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<AppLinkDto>> Update(int id, SaveAppLinkRequest req, CancellationToken ct)
    {
        var link = await db.AppLinks.FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted, ct);
        if (link is null) return NotFound();
        Apply(link, req);
        await db.SaveChangesAsync(ct);
        return Ok(Map(link));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var link = await db.AppLinks.FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted, ct);
        if (link is null) return NotFound();
        link.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    static AppLink Apply(AppLink link, SaveAppLinkRequest req)
    {
        link.Title = req.Title.Trim();
        link.Url = req.Url.Trim();
        link.Icon = string.IsNullOrWhiteSpace(req.Icon) ? "🔗" : req.Icon.Trim();
        link.ImageUrl = string.IsNullOrWhiteSpace(req.ImageUrl) ? null : req.ImageUrl.Trim();
        link.BgColor = string.IsNullOrWhiteSpace(req.BgColor) ? "#2563eb" : req.BgColor.Trim();
        link.DisplayOrder = req.DisplayOrder;
        link.IsActive = req.IsActive;
        link.AllowedRoles = req.AllowedRoles ?? "";
        return link;
    }
}
