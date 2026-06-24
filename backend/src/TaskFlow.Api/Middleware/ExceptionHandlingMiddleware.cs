using System.Text.Json;
using TaskFlow.Application.Common.Exceptions;

namespace TaskFlow.Api.Middleware;

/// <summary>Translates exceptions into RFC-7807-style JSON problem responses.</summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (AppException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception processing {Path}", context.Request.Path);
            await WriteAsync(context, 500, "An unexpected error occurred.");
        }
    }

    private static async Task WriteAsync(HttpContext context, int status, string message)
    {
        if (context.Response.HasStarted) return;
        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new
        {
            status,
            title = message,
            traceId = context.TraceIdentifier
        });
        await context.Response.WriteAsync(payload);
    }
}
