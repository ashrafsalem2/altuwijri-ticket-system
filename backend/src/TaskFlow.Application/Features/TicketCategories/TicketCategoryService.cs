using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Features.TicketCategories;

public interface ITicketCategoryService
{
    Task<IReadOnlyList<TicketCategoryDto>> GetAllAsync(CancellationToken ct = default);
    Task<TicketCategoryDto> CreateAsync(SaveTicketCategoryRequest request, CancellationToken ct = default);
    Task<TicketCategoryDto> UpdateAsync(int id, SaveTicketCategoryRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

public class TicketCategoryService(IApplicationDbContext db) : ITicketCategoryService
{
    public async Task<IReadOnlyList<TicketCategoryDto>> GetAllAsync(CancellationToken ct = default)
    {
        var categories = await db.TicketCategories.AsNoTracking()
            .OrderBy(c => c.DisplayOrder).ThenBy(c => c.Name)
            .ToListAsync(ct);

        var taskCounts = await db.Tasks.AsNoTracking()
            .Where(t => !t.IsDeleted && t.CategoryId != null)
            .GroupBy(t => t.CategoryId)
            .Select(g => new { CategoryId = g.Key!.Value, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

        var techCounts = await db.UserCategories.AsNoTracking()
            .GroupBy(uc => uc.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

        return categories.Select(c => ToDto(c, taskCounts, techCounts)).ToList();
    }

    public async Task<TicketCategoryDto> CreateAsync(SaveTicketCategoryRequest request, CancellationToken ct = default)
    {
        var category = new TicketCategory
        {
            Name = request.Name.Trim(),
            NameAr = string.IsNullOrWhiteSpace(request.NameAr) ? null : request.NameAr.Trim(),
            Description = request.Description,
            Icon = request.Icon.Trim(),
            Color = request.Color,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            DefaultType = ParseType(request.DefaultType),
            CreatedAt = DateTime.UtcNow
        };
        db.TicketCategories.Add(category);
        await db.SaveChangesAsync(ct);
        return ToDto(category, new(), new());
    }

    public async Task<TicketCategoryDto> UpdateAsync(int id, SaveTicketCategoryRequest request, CancellationToken ct = default)
    {
        var category = await db.TicketCategories.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct)
            ?? throw new NotFoundException("TicketCategory", id);

        category.Name = request.Name.Trim();
        category.NameAr = string.IsNullOrWhiteSpace(request.NameAr) ? null : request.NameAr.Trim();
        category.Description = request.Description;
        category.Icon = request.Icon.Trim();
        category.Color = request.Color;
        category.DisplayOrder = request.DisplayOrder;
        category.IsActive = request.IsActive;
        category.DefaultType = ParseType(request.DefaultType);
        category.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return ToDto(category, new(), new());
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var category = await db.TicketCategories.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct)
            ?? throw new NotFoundException("TicketCategory", id);
        category.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    private static TicketCategoryDto ToDto(
        TicketCategory c,
        Dictionary<int, int> taskCounts,
        Dictionary<int, int> techCounts) =>
        new(c.Id, c.Name, c.NameAr, c.Description, c.Icon, c.Color ?? "#3b82f6",
            c.DisplayOrder, c.IsActive,
            taskCounts.GetValueOrDefault(c.Id), techCounts.GetValueOrDefault(c.Id),
            c.DefaultType?.ToString());

    private static TaskType? ParseType(string? value) =>
        Enum.TryParse<TaskType>(value, out var t) ? t : null;
}
