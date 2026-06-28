using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Infrastructure.Persistence.Configurations;

public class DepartmentConfig : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> b)
    {
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Code).HasMaxLength(20);
        b.Property(x => x.Description).HasMaxLength(500);
        b.HasIndex(x => x.Name).IsUnique();
        b.HasQueryFilter(x => !x.IsDeleted);
    }
}

public class RoleConfig : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> b)
    {
        b.Property(x => x.Name).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.Name).IsUnique();
        b.Property(x => x.Description).HasMaxLength(200);
    }
}

public class UserConfig : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.Property(x => x.UserName).HasMaxLength(50).IsRequired();
        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.Property(x => x.FullName).HasMaxLength(150).IsRequired();
        b.Property(x => x.PasswordHash).IsRequired();
        b.Property(x => x.JobTitle).HasMaxLength(100);
        b.Property(x => x.PhoneNumber).HasMaxLength(30);
        b.Property(x => x.AvatarColor).HasMaxLength(20);
        b.HasIndex(x => x.UserName).IsUnique();
        b.HasIndex(x => x.Email).IsUnique();
        b.HasQueryFilter(x => !x.IsDeleted);
        b.HasOne(x => x.Role).WithMany(r => r.Users).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Branch).WithMany(br => br.Users).HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Department).WithMany(d => d.Users).HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class AreaConfig : IEntityTypeConfiguration<Area>
{
    public void Configure(EntityTypeBuilder<Area> b)
    {
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Code).HasMaxLength(20).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        b.HasIndex(x => x.Code).IsUnique();
        b.HasQueryFilter(x => !x.IsDeleted);
    }
}

public class BranchConfig : IEntityTypeConfiguration<Branch>
{
    public void Configure(EntityTypeBuilder<Branch> b)
    {
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Code).HasMaxLength(20).IsRequired();
        b.Property(x => x.Address).HasMaxLength(300);
        b.Property(x => x.Phone).HasMaxLength(30);
        b.HasIndex(x => x.Code).IsUnique();
        b.HasQueryFilter(x => !x.IsDeleted);
        b.HasOne(x => x.Area).WithMany(a => a.Branches).HasForeignKey(x => x.AreaId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class RefreshTokenConfig : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.Property(x => x.Token).HasMaxLength(200).IsRequired();
        b.HasIndex(x => x.Token);
        b.Property(x => x.CreatedByIp).HasMaxLength(60);
        b.HasOne(x => x.User).WithMany(u => u.RefreshTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class UserBranchConfig : IEntityTypeConfiguration<UserBranch>
{
    public void Configure(EntityTypeBuilder<UserBranch> b)
    {
        b.HasKey(x => new { x.UserId, x.BranchId });
        b.HasOne(x => x.User).WithMany(u => u.Branches).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ProjectConfig : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> b)
    {
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Code).HasMaxLength(20).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000);
        b.Property(x => x.Color).HasMaxLength(20);
        b.HasIndex(x => x.Code).IsUnique();
        b.HasQueryFilter(x => !x.IsDeleted);
        b.HasOne(x => x.Lead).WithMany().HasForeignKey(x => x.LeadId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class UserCategoryConfig : IEntityTypeConfiguration<UserCategory>
{
    public void Configure(EntityTypeBuilder<UserCategory> b)
    {
        b.HasKey(x => new { x.UserId, x.CategoryId });
        b.HasOne(x => x.User).WithMany(u => u.Categories).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Category).WithMany(c => c.UserCategories).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class TicketCategoryConfig : IEntityTypeConfiguration<TicketCategory>
{
    public void Configure(EntityTypeBuilder<TicketCategory> b)
    {
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.NameAr).HasMaxLength(100);
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.Icon).HasMaxLength(20).IsRequired();
        b.Property(x => x.Color).HasMaxLength(20);
        b.HasQueryFilter(x => !x.IsDeleted);
    }
}

public class WorkTaskConfig : IEntityTypeConfiguration<WorkTask>
{
    public void Configure(EntityTypeBuilder<WorkTask> b)
    {
        b.Property(x => x.Title).HasMaxLength(250).IsRequired();
        b.Property(x => x.Description).HasMaxLength(8000);
        b.HasIndex(x => x.Status);
        b.HasIndex(x => x.ProjectId);
        b.HasIndex(x => x.AssigneeId);
        b.HasIndex(x => x.CategoryId);
        b.HasQueryFilter(x => !x.IsDeleted);

        b.HasIndex(x => x.BranchId);
        b.HasOne(x => x.Project).WithMany(p => p.Tasks).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Branch).WithMany(br => br.Tasks).HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Category).WithMany(c => c.Tasks).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Assignee).WithMany(u => u.AssignedTasks).HasForeignKey(x => x.AssigneeId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Reporter).WithMany(u => u.ReportedTasks).HasForeignKey(x => x.ReporterId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ParentTask).WithMany(t => t.SubTasks).HasForeignKey(x => x.ParentTaskId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class CommentConfig : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> b)
    {
        b.Property(x => x.Content).HasMaxLength(4000).IsRequired();
        b.HasQueryFilter(x => !x.IsDeleted);
        b.HasOne(x => x.Task).WithMany(t => t.Comments).HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Author).WithMany(u => u.Comments).HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class AttachmentConfig : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> b)
    {
        b.Property(x => x.FileName).HasMaxLength(260).IsRequired();
        b.Property(x => x.StoredFileName).HasMaxLength(260);
        b.Property(x => x.ContentType).HasMaxLength(150);
        b.Property(x => x.Url).HasMaxLength(1000);
        b.HasQueryFilter(x => !x.IsDeleted);
        b.HasOne(x => x.Task).WithMany(t => t.Attachments).HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ChatConversationConfig : IEntityTypeConfiguration<ChatConversation>
{
    public void Configure(EntityTypeBuilder<ChatConversation> b)
    {
        b.Property(x => x.Subject).HasMaxLength(200).IsRequired();
        b.HasIndex(x => x.IssuerId);
        b.HasIndex(x => x.TechnicianId);
        b.HasOne(x => x.Issuer).WithMany().HasForeignKey(x => x.IssuerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Technician).WithMany().HasForeignKey(x => x.TechnicianId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Task).WithMany().HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class ChatMessageConfig : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> b)
    {
        b.Property(x => x.Content).HasMaxLength(4000).IsRequired();
        b.HasIndex(x => x.ConversationId);
        b.HasOne(x => x.Conversation).WithMany(c => c.Messages).HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Sender).WithMany().HasForeignKey(x => x.SenderId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class TagConfig : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> b)
    {
        b.Property(x => x.Name).HasMaxLength(50).IsRequired();
        b.Property(x => x.Color).HasMaxLength(20);
        b.HasIndex(x => x.Name).IsUnique();
    }
}

public class TaskTagConfig : IEntityTypeConfiguration<TaskTag>
{
    public void Configure(EntityTypeBuilder<TaskTag> b)
    {
        b.HasKey(x => new { x.TaskId, x.TagId });
        b.HasOne(x => x.Task).WithMany(t => t.TaskTags).HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Tag).WithMany(t => t.TaskTags).HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class NotificationConfig : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.Property(x => x.Title).HasMaxLength(150).IsRequired();
        b.Property(x => x.Message).HasMaxLength(500).IsRequired();
        b.HasIndex(x => new { x.UserId, x.IsRead });
        b.HasOne(x => x.User).WithMany(u => u.Notifications).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ActivityLogConfig : IEntityTypeConfiguration<ActivityLog>
{
    public void Configure(EntityTypeBuilder<ActivityLog> b)
    {
        b.Property(x => x.Action).HasMaxLength(100).IsRequired();
        b.Property(x => x.Field).HasMaxLength(100);
        b.Property(x => x.OldValue).HasMaxLength(500);
        b.Property(x => x.NewValue).HasMaxLength(500);
        b.HasIndex(x => x.CreatedAt);
        b.HasOne(x => x.Task).WithMany(t => t.Activities).HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
    }
}
