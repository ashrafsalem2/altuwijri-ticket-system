namespace TaskFlow.Infrastructure.Auth;

/// <summary>Strongly-typed JWT configuration bound from appsettings ("Jwt" section).</summary>
public class JwtSettings
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "TaskFlow";
    public string Audience { get; set; } = "TaskFlowClient";
    public int AccessTokenMinutes { get; set; } = 60;
}
