using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Features.Reports;

namespace TaskFlow.Api.Controllers;

/// <summary>Printable branch, area, organization and employee ticket reports.</summary>
public class ReportsController(IReportService reports, ICurrentUserService currentUser) : ApiControllerBase
{
    [HttpGet("branch/{branchId:int}")]
    public async Task<ActionResult<BranchReportDto>> Branch(int branchId, CancellationToken ct)
        => Ok(await reports.GetBranchReportAsync(branchId, ct));

    [HttpGet("area/{areaId:int}")]
    public async Task<ActionResult<AreaReportDto>> Area(int areaId, CancellationToken ct)
        => Ok(await reports.GetAreaReportAsync(areaId, ct));

    [HttpGet("overview")]
    public async Task<ActionResult<OverviewReportDto>> Overview(CancellationToken ct)
        => Ok(await reports.GetOverviewAsync(ct));

    /// <summary>Returns the current employee's own submitted tickets, optionally filtered by date range.</summary>
    [HttpGet("my-tickets")]
    public async Task<ActionResult<EmployeeTicketReportDto>> MyTickets(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        if (!currentUser.UserId.HasValue) return Unauthorized();
        return Ok(await reports.GetMyTicketsReportAsync(currentUser.UserId.Value, from, to, ct));
    }

    [HttpGet("by-tag")]
    public async Task<ActionResult<ByTagReportDto>> ByTag(CancellationToken ct)
        => Ok(await reports.GetByTagAsync(ct));

    [HttpGet("by-user")]
    public async Task<ActionResult<ByUserReportDto>> ByUser(CancellationToken ct)
        => Ok(await reports.GetByUserAsync(ct));
}
