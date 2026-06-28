using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Api.Controllers;

[Route("api/guidelines")]
public class GuidelinesController(IApplicationDbContext db) : ApiControllerBase
{
    static GuidelineDto Map(Guideline g) =>
        new(g.Id, g.Title, g.Body, g.DisplayOrder, g.IsActive);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GuidelineDto>>> GetAll(CancellationToken ct)
    {
        var list = await db.Guidelines
            .Where(g => !g.IsDeleted)
            .OrderBy(g => g.DisplayOrder).ThenBy(g => g.Id)
            .ToListAsync(ct);
        return Ok(list.Select(Map).ToList());
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<GuidelineDto>> Create(SaveGuidelineRequest req, CancellationToken ct)
    {
        var g = new Guideline
        {
            Title = req.Title.Trim(),
            Body = req.Body.Trim(),
            DisplayOrder = req.DisplayOrder,
            IsActive = req.IsActive
        };
        db.Guidelines.Add(g);
        await db.SaveChangesAsync(ct);
        return Ok(Map(g));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<GuidelineDto>> Update(int id, SaveGuidelineRequest req, CancellationToken ct)
    {
        var g = await db.Guidelines.FirstOrDefaultAsync(g => g.Id == id && !g.IsDeleted, ct);
        if (g is null) return NotFound();
        g.Title = req.Title.Trim();
        g.Body = req.Body.Trim();
        g.DisplayOrder = req.DisplayOrder;
        g.IsActive = req.IsActive;
        await db.SaveChangesAsync(ct);
        return Ok(Map(g));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var g = await db.Guidelines.FirstOrDefaultAsync(g => g.Id == id && !g.IsDeleted, ct);
        if (g is null) return NotFound();
        g.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record GuidelineDto(int Id, string Title, string Body, int DisplayOrder, bool IsActive);
public record SaveGuidelineRequest(string Title, string Body, int DisplayOrder, bool IsActive);
