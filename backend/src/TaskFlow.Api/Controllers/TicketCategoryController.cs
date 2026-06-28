using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Features.TicketCategories;

namespace TaskFlow.Api.Controllers;

[Route("api/ticket-categories")]
public class TicketCategoriesController(ITicketCategoryService svc) : ApiControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<TicketCategoryDto>>> GetAll(CancellationToken ct) =>
        Ok(await svc.GetAllAsync(ct));

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TicketCategoryDto>> Create(SaveTicketCategoryRequest request, CancellationToken ct) =>
        Ok(await svc.CreateAsync(request, ct));

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TicketCategoryDto>> Update(int id, SaveTicketCategoryRequest request, CancellationToken ct) =>
        Ok(await svc.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await svc.DeleteAsync(id, ct);
        return NoContent();
    }
}
