using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Features.Organization;

namespace TaskFlow.Api.Controllers;

/// <summary>Areas endpoints.</summary>
public class AreasController(IOrganizationService org) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AreaDto>>> GetAll(CancellationToken ct) => Ok(await org.GetAreasAsync(ct));

    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    [HttpPost]
    public async Task<ActionResult<AreaDto>> Create(CreateAreaRequest request, CancellationToken ct) => Ok(await org.CreateAreaAsync(request, ct));

    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<AreaDto>> Update(int id, UpdateAreaRequest request, CancellationToken ct) => Ok(await org.UpdateAreaAsync(id, request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) { await org.DeleteAreaAsync(id, ct); return NoContent(); }
}

/// <summary>Branches endpoints.</summary>
public class BranchesController(IOrganizationService org) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BranchDto>>> GetAll([FromQuery] int? areaId, CancellationToken ct) => Ok(await org.GetBranchesAsync(areaId, ct));

    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    [HttpPost]
    public async Task<ActionResult<BranchDto>> Create(CreateBranchRequest request, CancellationToken ct) => Ok(await org.CreateBranchAsync(request, ct));

    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<BranchDto>> Update(int id, UpdateBranchRequest request, CancellationToken ct) => Ok(await org.UpdateBranchAsync(id, request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) { await org.DeleteBranchAsync(id, ct); return NoContent(); }
}
