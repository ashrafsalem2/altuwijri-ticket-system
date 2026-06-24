using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Common.Mapping;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Features.Tasks;

public interface ITagService
{
    Task<IReadOnlyList<TagDto>> GetAllAsync(CancellationToken ct = default);
    Task<TagDto> CreateAsync(CreateTagRequest request, CancellationToken ct = default);
    Task<TagDto> UpdateAsync(int id, UpdateTagRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class TagService(IApplicationDbContext db) : ITagService
{
    public async Task<IReadOnlyList<TagDto>> GetAllAsync(CancellationToken ct = default)
    {
        var tags = await db.Tags.AsNoTracking().OrderBy(t => t.Name).ToListAsync(ct);
        return tags.Select(t => t.ToDto()).ToList();
    }

    public async Task<TagDto> CreateAsync(CreateTagRequest request, CancellationToken ct = default)
    {
        var name = request.Name.Trim();
        if (await db.Tags.AnyAsync(t => t.Name.ToLower() == name.ToLower(), ct))
            throw new ConflictException($"Tag '{name}' already exists.");
        var tag = new Tag { Name = name, Color = request.Color, Icon = request.Icon };
        db.Tags.Add(tag);
        await db.SaveChangesAsync(ct);
        return tag.ToDto();
    }

    public async Task<TagDto> UpdateAsync(int id, UpdateTagRequest request, CancellationToken ct = default)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Tag", id);
        var name = request.Name.Trim();
        if (await db.Tags.AnyAsync(t => t.Id != id && t.Name.ToLower() == name.ToLower(), ct))
            throw new ConflictException($"Tag '{name}' already exists.");
        tag.Name = name;
        tag.Color = request.Color;
        tag.Icon = request.Icon;
        await db.SaveChangesAsync(ct);
        return tag.ToDto();
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Tag", id);
        db.Tags.Remove(tag);
        await db.SaveChangesAsync(ct);
    }
}
