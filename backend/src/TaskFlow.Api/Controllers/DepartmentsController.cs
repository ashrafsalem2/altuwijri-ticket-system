using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Features.Departments;

namespace TaskFlow.Api.Controllers;

[Authorize]
[Route("api/departments")]
public class DepartmentsController(IDepartmentService svc) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DepartmentDto>>> GetAll(CancellationToken ct)
        => Ok(await svc.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> Get(int id, CancellationToken ct)
        => Ok(await svc.GetByIdAsync(id, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<DepartmentDto>> Create([FromBody] SaveDepartmentRequest request, CancellationToken ct)
    {
        var result = await svc.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<DepartmentDto>> Update(int id, [FromBody] SaveDepartmentRequest request, CancellationToken ct)
        => Ok(await svc.UpdateAsync(id, request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await svc.DeleteAsync(id, ct);
        return NoContent();
    }
}
