using Microsoft.Extensions.DependencyInjection;
using TaskFlow.Application.Features.Attachments;
using TaskFlow.Application.Features.Auth;
using TaskFlow.Application.Features.Chat;
using TaskFlow.Application.Features.Comments;
using TaskFlow.Application.Features.Dashboard;
using TaskFlow.Application.Features.Notifications;
using TaskFlow.Application.Features.Organization;
using TaskFlow.Application.Features.Projects;
using TaskFlow.Application.Features.Reports;
using TaskFlow.Application.Features.Tasks;
using TaskFlow.Application.Features.Users;

namespace TaskFlow.Application;

public static class DependencyInjection
{
    /// <summary>Registers all application-layer services.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<ITagService, TagService>();
        services.AddScoped<ICommentService, CommentService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IAttachmentService, AttachmentService>();
        services.AddScoped<IChatService, ChatService>();
        return services;
    }
}
