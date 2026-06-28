using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Features.Tasks;

namespace TaskFlow.Api.Controllers;

/// <summary>Reusable task labels.</summary>
public class TagsController(ITagService tags) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TagDto>>> GetAll(CancellationToken ct)
        => Ok(await tags.GetAllAsync(ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<TagDto>> Create(CreateTagRequest request, CancellationToken ct)
        => Ok(await tags.CreateAsync(request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<TagDto>> Update(int id, UpdateTagRequest request, CancellationToken ct)
        => Ok(await tags.UpdateAsync(id, request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await tags.DeleteAsync(id, ct);
        return NoContent();
    }
}
