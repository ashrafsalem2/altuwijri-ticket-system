using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Features.Dashboard;

namespace TaskFlow.Api.Controllers;

/// <summary>Aggregated metrics, charts and activity feed for the dashboard.</summary>
public class DashboardController(IDashboardService dashboard) : ApiControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> Stats(CancellationToken ct)
        => Ok(await dashboard.GetStatsAsync(CurrentUserId, ct));

    [HttpGet("charts")]
    public async Task<ActionResult<DashboardChartsDto>> Charts(CancellationToken ct)
        => Ok(await dashboard.GetChartsAsync(ct));

    [HttpGet("activity")]
    public async Task<ActionResult<IReadOnlyList<ActivityFeedItemDto>>> Activity([FromQuery] int take = 15, CancellationToken ct = default)
        => Ok(await dashboard.GetRecentActivityAsync(take, ct));
}
