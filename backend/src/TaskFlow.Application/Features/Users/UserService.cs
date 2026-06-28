using Microsoft.EntityFrameworkCore;
using TaskFlow.Application.Common.Exceptions;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Application.Common.Mapping;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Features.Users;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetAllAsync(bool includeInactive, CancellationToken ct = default);
    Task<UserDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<UserDto> UpdateAsync(int id, UpdateUserRequest request, CancellationToken ct = default);
    Task DeactivateAsync(int id, CancellationToken ct = default);
    Task ResetPasswordAsync(int id, string newPassword, CancellationToken ct = default);
    Task SetAvailabilityAsync(int userId, bool available, CancellationToken ct = default);
    Task<IReadOnlyList<RoleDto>> GetRolesAsync(CancellationToken ct = default);
}

public class UserService(IApplicationDbContext db, IPasswordHasher hasher) : IUserService
{
    private static readonly string[] Palette =
        ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

    private IQueryable<User> UserQuery() => db.Users
        .Include(u => u.Role)
        .Include(u => u.Branch!).ThenInclude(b => b.Area)
        .Include(u => u.Department)
        .Include(u => u.Categories).ThenInclude(uc => uc.Category)
        .Include(u => u.Branches).ThenInclude(ub => ub.Branch)
        .AsNoTracking();

    public async Task<IReadOnlyList<UserDto>> GetAllAsync(bool includeInactive, CancellationToken ct = default)
    {
        var query = UserQuery().AsQueryable();
        if (!includeInactive) query = query.Where(u => u.IsActive);
        var users = await query.OrderBy(u => u.FullName).ToListAsync(ct);
        return users.Select(u => u.ToDto()).ToList();
    }

    public async Task<UserDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var user = await UserQuery().FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("User", id);
        return user.ToDto();
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var userName = request.UserName.Trim();
        var email = request.Email.Trim();

        if (await db.Users.AnyAsync(u => u.UserName.ToLower() == userName.ToLower(), ct))
            throw new ConflictException($"Username '{userName}' is already taken.");
        if (await db.Users.AnyAsync(u => u.Email.ToLower() == email.ToLower(), ct))
            throw new ConflictException($"Email '{email}' is already registered.");
        if (!await db.Roles.AnyAsync(r => r.Id == request.RoleId, ct))
            throw new BadRequestException("Specified role does not exist.");

        var user = new User
        {
            UserName = userName,
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = hasher.Hash(request.Password),
            RoleId = request.RoleId,
            BranchId = request.BranchId,
            JobTitle = request.JobTitle,
            DepartmentId = request.DepartmentId,
            PhoneNumber = request.PhoneNumber,
            AvatarColor = Palette[Random.Shared.Next(Palette.Length)],
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        await SyncCategoriesAsync(user.Id, request.CategoryIds, ct);
        await SyncBranchesAsync(user.Id, request.BranchIds, ct);

        return await GetByIdAsync(user.Id, ct);
    }

    public async Task<UserDto> UpdateAsync(int id, UpdateUserRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new NotFoundException("User", id);

        var email = request.Email.Trim();
        if (await db.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == email.ToLower(), ct))
            throw new ConflictException($"Email '{email}' is already registered.");
        if (!await db.Roles.AnyAsync(r => r.Id == request.RoleId, ct))
            throw new BadRequestException("Specified role does not exist.");

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.RoleId = request.RoleId;
        user.BranchId = request.BranchId;
        user.JobTitle = request.JobTitle;
        user.DepartmentId = request.DepartmentId;
        user.PhoneNumber = request.PhoneNumber;
        user.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);

        await SyncCategoriesAsync(id, request.CategoryIds, ct);
        await SyncBranchesAsync(id, request.BranchIds, ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task DeactivateAsync(int id, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new NotFoundException("User", id);
        user.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public async Task ResetPasswordAsync(int id, string newPassword, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new NotFoundException("User", id);
        if (newPassword.Length < 6)
            throw new BadRequestException("Password must be at least 6 characters.");
        user.PasswordHash = hasher.Hash(newPassword);
        await db.SaveChangesAsync(ct);
    }

    public async Task SetAvailabilityAsync(int userId, bool available, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User", userId);
        user.IsAvailable = available;
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<RoleDto>> GetRolesAsync(CancellationToken ct = default)
    {
        var roles = await db.Roles.AsNoTracking().OrderBy(r => r.Id).ToListAsync(ct);
        return roles.Select(r => r.ToDto()).ToList();
    }

    private async Task SyncCategoriesAsync(int userId, List<int>? categoryIds, CancellationToken ct)
    {
        var existing = await db.UserCategories.Where(uc => uc.UserId == userId).ToListAsync(ct);
        db.UserCategories.RemoveRange(existing);
        if (categoryIds?.Count > 0)
        {
            foreach (var catId in categoryIds.Distinct())
                db.UserCategories.Add(new UserCategory { UserId = userId, CategoryId = catId });
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task SyncBranchesAsync(int userId, List<int>? branchIds, CancellationToken ct)
    {
        var existing = await db.UserBranches.Where(ub => ub.UserId == userId).ToListAsync(ct);
        db.UserBranches.RemoveRange(existing);
        if (branchIds?.Count > 0)
        {
            foreach (var branchId in branchIds.Distinct())
                db.UserBranches.Add(new UserBranch { UserId = userId, BranchId = branchId });
        }
        await db.SaveChangesAsync(ct);
    }
}
