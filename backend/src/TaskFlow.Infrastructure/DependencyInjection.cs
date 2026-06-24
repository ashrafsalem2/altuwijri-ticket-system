using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TaskFlow.Application.Common.Interfaces;
using TaskFlow.Infrastructure.Auth;
using TaskFlow.Infrastructure.Email;
using TaskFlow.Infrastructure.Messaging;
using TaskFlow.Infrastructure.Persistence;
using TaskFlow.Infrastructure.Storage;

namespace TaskFlow.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Registers EF Core, auth, and storage infrastructure.</summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(
                config.GetConnectionString("DefaultConnection"),
                sql => sql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.Configure<JwtSettings>(config.GetSection("Jwt"));
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddSingleton<IFileStorage, LocalFileStorage>();
        services.AddTransient<IEmailService, EmailService>();
        services.AddTransient<IWhatsAppService, WhatsAppService>();

        return services;
    }
}
