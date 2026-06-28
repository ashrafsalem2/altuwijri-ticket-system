using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Common.Authorization;
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

    [HttpGet("by-group")]
    public async Task<ActionResult<ByGroupReportDto>> ByGroup(CancellationToken ct)
        => Ok(await reports.GetByGroupAsync(ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("by-department")]
    public async Task<ActionResult<ByDepartmentReportDto>> ByDepartment(CancellationToken ct)
        => Ok(await reports.GetByDepartmentAsync(ct));

    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<SingleUserReportDto>> SingleUser(
        int userId, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        => Ok(await reports.GetSingleUserAsync(userId, from, to, ct));

    [HttpGet("task/{taskId:int}")]
    public async Task<ActionResult<SingleTaskReportDto>> SingleTask(int taskId, CancellationToken ct)
        => Ok(await reports.GetSingleTaskAsync(taskId, ct));

    [HttpGet("all-tasks")]
    public async Task<ActionResult<AllTasksReportDto>> AllTasks(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
        => Ok(await reports.GetAllTasksAsync(from, to, ct));

    [HttpGet("trend")]
    public async Task<ActionResult<TrendReportDto>> Trend(CancellationToken ct)
        => Ok(await reports.GetTrendAsync(ct));

    [HttpGet("overdue")]
    public async Task<ActionResult<OverdueReportDto>> Overdue(CancellationToken ct)
        => Ok(await reports.GetOverdueAsync(ct));
}
