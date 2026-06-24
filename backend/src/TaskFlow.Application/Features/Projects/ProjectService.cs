using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Common.Mapping;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Features.Projects;

public interface IProjectService
{
    Task<IReadOnlyList<ProjectDto>> GetAllAsync(CancellationToken ct = default);
    Task<ProjectDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<ProjectDto> CreateAsync(CreateProjectRequest request, CancellationToken ct = default);
    Task<ProjectDto> UpdateAsync(int id, UpdateProjectRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class ProjectService(IApplicationDbContext db) : IProjectService
{
    public async Task<IReadOnlyList<ProjectDto>> GetAllAsync(CancellationToken ct = default)
    {
        var projects = await db.Projects
            .Include(p => p.Lead)
            .Include(p => p.Tasks.Where(t => !t.IsDeleted))
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .ToListAsync(ct);
        return projects.Select(p => p.ToDto()).ToList();
    }

    public async Task<ProjectDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var project = await db.Projects
            .Include(p => p.Lead)
            .Include(p => p.Tasks.Where(t => !t.IsDeleted))
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException("Project", id);
        return project.ToDto();
    }

    public async Task<ProjectDto> CreateAsync(CreateProjectRequest request, CancellationToken ct = default)
    {
        var code = request.Code.Trim().ToUpper();
        if (await db.Projects.AnyAsync(p => p.Code.ToUpper() == code, ct))
            throw new ConflictException($"Project code '{code}' already exists.");

        var project = new Project
        {
            Name = request.Name.Trim(),
            Code = code,
            Description = request.Description,
            Color = request.Color,
            Status = request.Status,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            LeadId = request.LeadId
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(project.Id, ct);
    }

    public async Task<ProjectDto> UpdateAsync(int id, UpdateProjectRequest request, CancellationToken ct = default)
    {
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException("Project", id);

        project.Name = request.Name.Trim();
        project.Description = request.Description;
        project.Color = request.Color;
        project.Status = request.Status;
        project.StartDate = request.StartDate;
        project.EndDate = request.EndDate;
        project.LeadId = request.LeadId;
        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var project = await db.Projects.Include(p => p.Tasks).FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException("Project", id);
        if (project.Tasks.Any(t => !t.IsDeleted))
            throw new ConflictException("Cannot delete a project that still has tasks.");
        project.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }
}
