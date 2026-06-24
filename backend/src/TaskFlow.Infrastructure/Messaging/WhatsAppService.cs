using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TaskFlow.Application.Common.Interfaces;

namespace TaskFlow.Infrastructure.Messaging;

/// <summary>
/// Sends WhatsApp messages via the Twilio Conversations REST API.
/// Requires a Twilio account with WhatsApp enabled (sandbox or approved number).
/// Set WhatsApp:Enabled=false to disable without removing config.
/// </summary>
public sealed class WhatsAppService(
    IConfiguration config,
    ILogger<WhatsAppService> logger) : IWhatsAppService
{
    public async Task SendTaskAssignedAsync(
        string toPhone, string toName,
        string taskTitle, int taskId,
        string priority, string projectName,
        CancellationToken ct = default)
    {
        var wa = config.GetSection("WhatsApp");

        if (!bool.TryParse(wa["Enabled"], out var enabled) || !enabled)
        {
            logger.LogDebug("WhatsApp disabled — skipping notification.");
            return;
        }

        var accountSid = wa["AccountSid"] ?? "";
        var authToken  = wa["AuthToken"]  ?? "";
        var fromNumber = wa["FromNumber"] ?? "whatsapp:+14155238886"; // Twilio sandbox default

        if (string.IsNullOrWhiteSpace(accountSid) || string.IsNullOrWhiteSpace(authToken))
        {
            logger.LogWarning("WhatsApp credentials not configured (AccountSid/AuthToken missing).");
            return;
        }

        // Use the user's phone, fall back to the configured notification number
        var resolvedPhone = !string.IsNullOrWhiteSpace(toPhone)
            ? toPhone
            : wa["FallbackPhone"] ?? "";

        if (string.IsNullOrWhiteSpace(resolvedPhone))
        {
            logger.LogDebug("WhatsApp skipped — no phone number and no FallbackPhone configured.");
            return;
        }

        // Normalise phone: ensure it starts with + and strip spaces/dashes
        var phone = NormalisePhone(resolvedPhone);
        var body  = BuildMessage(toName, taskTitle, taskId, priority, projectName, wa["AppBaseUrl"] ?? "http://127.0.0.1:8080");

        try
        {
            var url     = $"https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json";
            var payload = new Dictionary<string, string>
            {
                ["From"] = fromNumber.StartsWith("whatsapp:") ? fromNumber : $"whatsapp:{fromNumber}",
                ["To"]   = $"whatsapp:{phone}",
                ["Body"] = body
            };

            using var client  = new HttpClient();
            var credentials   = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accountSid}:{authToken}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            var response = await client.PostAsync(url, new FormUrlEncodedContent(payload), ct);

            if (response.IsSuccessStatusCode)
                logger.LogInformation("WhatsApp sent to {Phone} for task #{TaskId}", phone, taskId);
            else
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                logger.LogError("WhatsApp send failed ({Status}) to {Phone} for task #{TaskId}: {Body}",
                    (int)response.StatusCode, phone, taskId, err);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "WhatsApp exception for task #{TaskId}: {Message}", taskId, ex.Message);
        }
    }

    private static string NormalisePhone(string raw)
    {
        var digits = new string(raw.Where(c => c == '+' || char.IsDigit(c)).ToArray());
        return digits.StartsWith('+') ? digits : $"+{digits}";
    }

    private static string BuildMessage(
        string name, string title, int taskId,
        string priority, string project, string baseUrl)
    {
        var proj = string.IsNullOrWhiteSpace(project) ? "" : $"\n📁 *{project}*";
        var prio = string.IsNullOrWhiteSpace(priority) ? "" : $"\n🔴 Priority: {priority}";
        var url  = $"{baseUrl}/tasks/{taskId}";

        return $"""
            🔔 *New Ticket Assigned — ATS*
            ────────────────────
            Hello {name},

            *#{taskId}* — {title}{proj}{prio}

            Please login to accept and start working on this ticket:
            {url}
            ────────────────────
            _Altuwijri Ticket System_
            """;
    }
}
