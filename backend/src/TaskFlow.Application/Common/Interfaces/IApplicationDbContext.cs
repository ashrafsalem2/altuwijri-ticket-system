using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Common.Interfaces;

/// <summary>Abstraction over the EF Core context so application services stay persistence-agnostic.</summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<Department> Departments { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Area> Areas { get; }
    DbSet<Branch> Branches { get; }
    DbSet<Device> Devices { get; }
    DbSet<Project> Projects { get; }
    DbSet<ChatConversation> ChatConversations { get; }
    DbSet<ChatMessage> ChatMessages { get; }
    DbSet<WorkTask> Tasks { get; }
    DbSet<Comment> Comments { get; }
    DbSet<Attachment> Attachments { get; }
    DbSet<Tag> Tags { get; }
    DbSet<TaskTag> TaskTags { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<ActivityLog> ActivityLogs { get; }
    DbSet<AppLink> AppLinks { get; }
    DbSet<Guideline> Guidelines { get; }
    DbSet<TicketCategory> TicketCategories { get; }
    DbSet<UserCategory> UserCategories { get; }
    DbSet<UserIssuableCategory> UserIssuableCategories { get; }
    DbSet<UserBranch> UserBranches { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
