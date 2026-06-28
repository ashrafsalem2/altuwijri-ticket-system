using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Authorization;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Features.Organization;

namespace TaskFlow.Api.Controllers;

public class AreasController(IOrganizationService org) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AreaDto>>> GetAll(CancellationToken ct) => Ok(await org.GetAreasAsync(ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<AreaDto>> Create(CreateAreaRequest request, CancellationToken ct) => Ok(await org.CreateAreaAsync(request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<AreaDto>> Update(int id, UpdateAreaRequest request, CancellationToken ct) => Ok(await org.UpdateAreaAsync(id, request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) { await org.DeleteAreaAsync(id, ct); return NoContent(); }
}

public class BranchesController(IOrganizationService org, IApplicationDbContext db) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BranchDto>>> GetAll([FromQuery] int? areaId, CancellationToken ct) => Ok(await org.GetBranchesAsync(areaId, ct));

    [HttpGet("me")]
    public async Task<ActionResult<BranchPublicDto?>> GetMyBranch(CancellationToken ct)
    {
        var branchId = await db.Users
            .Where(u => u.Id == CurrentUserId)
            .Select(u => (int?)u.BranchId)
            .FirstOrDefaultAsync(ct);

        if (branchId is null) return Ok(null);

        var b = await db.Branches
            .Include(b => b.Area)
            .Include(b => b.Devices)
            .FirstOrDefaultAsync(b => b.Id == branchId && !b.IsDeleted, ct);

        if (b is null) return Ok(null);

        return Ok(new BranchPublicDto(
            b.Id, b.Name, b.Code, b.Address, b.Phone, b.Email, b.Area.Name,
            b.Devices
                .Where(d => !d.IsDeleted)
                .OrderBy(d => d.Label)
                .Select(d => new DevicePublicDto(d.Id, d.Label, d.AnyDeskNumber, d.UserName, d.Password))
                .ToList()
        ));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BranchDto>> GetOne(int id, CancellationToken ct) => Ok(await org.GetBranchAsync(id, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<BranchDto>> Create(CreateBranchRequest request, CancellationToken ct) => Ok(await org.CreateBranchAsync(request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<BranchDto>> Update(int id, UpdateBranchRequest request, CancellationToken ct) => Ok(await org.UpdateBranchAsync(id, request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) { await org.DeleteBranchAsync(id, ct); return NoContent(); }
}

public class DevicesController(IOrganizationService org) : ApiControllerBase
{
    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<ActionResult<DeviceDto>> Create(CreateDeviceRequest request, CancellationToken ct) => Ok(await org.CreateDeviceAsync(request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<DeviceDto>> Update(int id, UpdateDeviceRequest request, CancellationToken ct) => Ok(await org.UpdateDeviceAsync(id, request, ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) { await org.DeleteDeviceAsync(id, ct); return NoContent(); }
}
