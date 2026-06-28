using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Features.Departments;

public interface IDepartmentService
{
    Task<IReadOnlyList<DepartmentDto>> GetAllAsync(CancellationToken ct = default);
    Task<DepartmentDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<DepartmentDto> CreateAsync(SaveDepartmentRequest request, CancellationToken ct = default);
    Task<DepartmentDto> UpdateAsync(int id, SaveDepartmentRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class DepartmentService(IApplicationDbContext db) : IDepartmentService
{
    private IQueryable<Department> Query() => db.Departments
        .Include(d => d.Users.Where(u => u.IsActive && !u.IsDeleted))
        .AsNoTracking();

    public async Task<IReadOnlyList<DepartmentDto>> GetAllAsync(CancellationToken ct = default)
    {
        var depts = await Query().OrderBy(d => d.Name).ToListAsync(ct);
        return depts.Select(ToDto).ToList();
    }

    public async Task<DepartmentDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var dept = await Query().FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Department", id);
        return ToDto(dept);
    }

    public async Task<DepartmentDto> CreateAsync(SaveDepartmentRequest request, CancellationToken ct = default)
    {
        var name = request.Name.Trim();
        if (await db.Departments.AnyAsync(d => d.Name.ToLower() == name.ToLower(), ct))
            throw new ConflictException($"Department '{name}' already exists.");

        var dept = new Department
        {
            Name = name,
            Code = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim().ToUpper(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim()
        };
        db.Departments.Add(dept);
        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(dept.Id, ct);
    }

    public async Task<DepartmentDto> UpdateAsync(int id, SaveDepartmentRequest request, CancellationToken ct = default)
    {
        var dept = await db.Departments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Department", id);

        var name = request.Name.Trim();
        if (await db.Departments.AnyAsync(d => d.Id != id && d.Name.ToLower() == name.ToLower(), ct))
            throw new ConflictException($"Department '{name}' already exists.");

        dept.Name = name;
        dept.Code = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim().ToUpper();
        dept.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var dept = await db.Departments
            .Include(d => d.Users.Where(u => !u.IsDeleted))
            .FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException("Department", id);

        if (dept.Users.Any())
            throw new BadRequestException("Cannot delete a department that has users assigned.");

        db.Departments.Remove(dept);
        await db.SaveChangesAsync(ct);
    }

    private static DepartmentDto ToDto(Department d) =>
        new(d.Id, d.Name, d.Code, d.Description, d.Users.Count);
}
