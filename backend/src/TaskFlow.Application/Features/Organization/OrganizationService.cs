using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Features.Organization;

public interface IOrganizationService
{
    Task<IReadOnlyList<AreaDto>> GetAreasAsync(CancellationToken ct = default);
    Task<AreaDto> CreateAreaAsync(CreateAreaRequest request, CancellationToken ct = default);
    Task<AreaDto> UpdateAreaAsync(int id, UpdateAreaRequest request, CancellationToken ct = default);
    Task DeleteAreaAsync(int id, CancellationToken ct = default);

    Task<IReadOnlyList<BranchDto>> GetBranchesAsync(int? areaId, CancellationToken ct = default);
    Task<BranchDto> CreateBranchAsync(CreateBranchRequest request, CancellationToken ct = default);
    Task<BranchDto> UpdateBranchAsync(int id, UpdateBranchRequest request, CancellationToken ct = default);
    Task DeleteBranchAsync(int id, CancellationToken ct = default);
}

public class OrganizationService(IApplicationDbContext db) : IOrganizationService
{
    // ----- Areas -----
    public async Task<IReadOnlyList<AreaDto>> GetAreasAsync(CancellationToken ct = default) =>
        await db.Areas.AsNoTracking().OrderBy(a => a.Name)
            .Select(a => new AreaDto(a.Id, a.Name, a.Code, a.Description, a.Branches.Count(b => !b.IsDeleted)))
            .ToListAsync(ct);

    public async Task<AreaDto> CreateAreaAsync(CreateAreaRequest request, CancellationToken ct = default)
    {
        var code = request.Code.Trim().ToUpper();
        if (await db.Areas.AnyAsync(a => a.Code.ToUpper() == code, ct))
            throw new ConflictException($"Area code '{code}' already exists.");
        var area = new Area { Name = request.Name.Trim(), Code = code, Description = request.Description };
        db.Areas.Add(area);
        await db.SaveChangesAsync(ct);
        return new AreaDto(area.Id, area.Name, area.Code, area.Description, 0);
    }

    public async Task<AreaDto> UpdateAreaAsync(int id, UpdateAreaRequest request, CancellationToken ct = default)
    {
        var area = await db.Areas.FirstOrDefaultAsync(a => a.Id == id, ct) ?? throw new NotFoundException("Area", id);
        area.Name = request.Name.Trim();
        area.Description = request.Description;
        await db.SaveChangesAsync(ct);
        var count = await db.Branches.CountAsync(b => b.AreaId == id, ct);
        return new AreaDto(area.Id, area.Name, area.Code, area.Description, count);
    }

    public async Task DeleteAreaAsync(int id, CancellationToken ct = default)
    {
        var area = await db.Areas.FirstOrDefaultAsync(a => a.Id == id, ct) ?? throw new NotFoundException("Area", id);
        if (await db.Branches.AnyAsync(b => b.AreaId == id, ct))
            throw new ConflictException("Cannot delete an area that still has branches.");
        area.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    // ----- Branches -----
    public async Task<IReadOnlyList<BranchDto>> GetBranchesAsync(int? areaId, CancellationToken ct = default)
    {
        var q = db.Branches.Include(b => b.Area).AsNoTracking().AsQueryable();
        if (areaId.HasValue) q = q.Where(b => b.AreaId == areaId);
        return await q.OrderBy(b => b.Name)
            .Select(b => new BranchDto(b.Id, b.Name, b.Code, b.Address, b.Phone, b.AreaId, b.Area.Name,
                b.Users.Count(u => !u.IsDeleted)))
            .ToListAsync(ct);
    }

    public async Task<BranchDto> CreateBranchAsync(CreateBranchRequest request, CancellationToken ct = default)
    {
        var code = request.Code.Trim().ToUpper();
        if (await db.Branches.AnyAsync(b => b.Code.ToUpper() == code, ct))
            throw new ConflictException($"Branch code '{code}' already exists.");
        if (!await db.Areas.AnyAsync(a => a.Id == request.AreaId, ct))
            throw new BadRequestException("Specified area does not exist.");
        var branch = new Branch { Name = request.Name.Trim(), Code = code, AreaId = request.AreaId, Address = request.Address, Phone = request.Phone };
        db.Branches.Add(branch);
        await db.SaveChangesAsync(ct);
        return await GetBranchAsync(branch.Id, ct);
    }

    public async Task<BranchDto> UpdateBranchAsync(int id, UpdateBranchRequest request, CancellationToken ct = default)
    {
        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Id == id, ct) ?? throw new NotFoundException("Branch", id);
        if (!await db.Areas.AnyAsync(a => a.Id == request.AreaId, ct))
            throw new BadRequestException("Specified area does not exist.");
        branch.Name = request.Name.Trim();
        branch.AreaId = request.AreaId;
        branch.Address = request.Address;
        branch.Phone = request.Phone;
        await db.SaveChangesAsync(ct);
        return await GetBranchAsync(id, ct);
    }

    public async Task DeleteBranchAsync(int id, CancellationToken ct = default)
    {
        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Id == id, ct) ?? throw new NotFoundException("Branch", id);
        if (await db.Users.AnyAsync(u => u.BranchId == id, ct))
            throw new ConflictException("Cannot delete a branch that still has users.");
        branch.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    private async Task<BranchDto> GetBranchAsync(int id, CancellationToken ct)
    {
        var b = await db.Branches.Include(x => x.Area).AsNoTracking().FirstAsync(x => x.Id == id, ct);
        var users = await db.Users.CountAsync(u => u.BranchId == id, ct);
        return new BranchDto(b.Id, b.Name, b.Code, b.Address, b.Phone, b.AreaId, b.Area.Name, users);
    }
}
