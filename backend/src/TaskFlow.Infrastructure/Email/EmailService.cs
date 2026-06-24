#pragma warning disable SYSLIB0006 // SmtpClient is functional on .NET 10 for Gmail SMTP

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TaskFlow.Application.Common.Interfaces;

namespace TaskFlow.Infrastructure.Email;

public sealed class EmailService(IConfiguration config, ILogger<EmailService> logger) : IEmailService
{
    public async Task SendTaskAssignedAsync(
        string toEmail, string toName,
        string taskTitle, int taskId,
        string priority, string projectName,
        CancellationToken ct = default)
    {
        var smtp = config.GetSection("Smtp");
        var host = smtp["Host"] ?? "";
        var port = int.TryParse(smtp["Port"], out var p) ? p : 587;
        var username = smtp["Username"] ?? "";
        var password = smtp["Password"] ?? "";
        var fromAddr = smtp["FromAddress"] ?? username;
        var fromName = smtp["FromName"] ?? "Altuwijri Ticket System";
        var baseUrl = smtp["AppBaseUrl"] ?? "http://127.0.0.1:8080";
        var enableSsl = !string.Equals(smtp["EnableSsl"], "false", StringComparison.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(toEmail) || string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogDebug("Email skipped: SMTP not configured or recipient email empty.");
            return;
        }

        var subject = $"[ATS] Task Assigned: {taskTitle}";
        var body = BuildHtmlBody(toName, taskTitle, taskId, priority, projectName, baseUrl);

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(username, password),
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        var msg = new MailMessage
        {
            From = new MailAddress(fromAddr, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        msg.To.Add(new MailAddress(toEmail, toName));

        try
        {
            await client.SendMailAsync(msg, ct);
            logger.LogInformation("Email sent to {Email} for task #{TaskId}", toEmail, taskId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SMTP send failed to {Email} for task #{TaskId}: {Message}", toEmail, taskId, ex.Message);
        }
    }

    private static string BuildHtmlBody(
        string name, string taskTitle, int taskId,
        string priority, string projectName, string baseUrl)
    {
        var safeName = System.Net.WebUtility.HtmlEncode(name);
        var safeTitle = System.Net.WebUtility.HtmlEncode(taskTitle);
        var safePrio = System.Net.WebUtility.HtmlEncode(priority);
        var safeProj = System.Net.WebUtility.HtmlEncode(projectName);
        var projChip = string.IsNullOrEmpty(safeProj) ? ""
            : $"<span class=\"chip chip-proj\">&#128193; {safeProj}</span>";
        var prioChip = string.IsNullOrEmpty(safePrio) ? ""
            : $"<span class=\"chip chip-prio\">{safePrio}</span>";
        var taskUrl = $"{baseUrl}/tasks/{taskId}";

        return $$"""
            <!DOCTYPE html>
            <html dir="ltr" lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width,initial-scale=1" />
              <style>
                body { margin:0; padding:20px; background:#f1f5f9; font-family:Arial,Helvetica,sans-serif; color:#1e293b; }
                .wrap { max-width:560px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.1); }
                .hdr  { background:#6b1a1a; color:#fff; padding:24px 28px; }
                .hdr h1 { margin:0; font-size:18px; font-weight:700; letter-spacing:.03em; }
                .hdr p  { margin:4px 0 0; font-size:12px; opacity:.8; }
                .bdy  { padding:28px; }
                .bdy h2 { margin:0 0 12px; font-size:16px; }
                .bdy p  { margin:0 0 16px; font-size:14px; color:#475569; line-height:1.55; }
                .tbox { background:#fdf8f8; border:1px solid #e2d0d0; border-left:4px solid #6b1a1a; border-radius:8px; padding:16px 18px; margin-bottom:22px; }
                .tid  { font-size:11px; color:#94a3b8; margin-bottom:4px; }
                .ttitle { font-size:15px; font-weight:700; color:#0f172a; margin-bottom:10px; }
                .tmeta { display:flex; gap:16px; flex-wrap:wrap; }
                .chip { font-size:11px; padding:2px 10px; border-radius:999px; font-weight:600; }
                .chip-proj { background:#f1f5f9; color:#475569; }
                .chip-prio { background:#fee2e2; color:#991b1b; }
                .btn  { display:inline-block; background:#6b1a1a; color:#fff; text-decoration:none; padding:11px 24px; border-radius:7px; font-size:14px; font-weight:700; margin-top:4px; }
                .ftr  { padding:16px 28px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center; }
              </style>
            </head>
            <body>
              <div class="wrap">
                <div class="hdr">
                  <h1>&#x646;&#x638;&#x627;&#x645; &#x62A;&#x630;&#x627;&#x643;&#x631; &#x627;&#x644;&#x62A;&#x648;&#x64A;&#x62C;&#x631;&#x64A; &nbsp;&middot;&nbsp; ATS</h1>
                  <p>Altuwijri Ticket System &mdash; IT Department</p>
                </div>
                <div class="bdy">
                  <h2>Hello, {{safeName}}</h2>
                  <p>A task has been assigned to you. Please review it and take action as soon as possible.</p>
                  <div class="tbox">
                    <div class="tid">Task #{{taskId}}</div>
                    <div class="ttitle">{{safeTitle}}</div>
                    <div class="tmeta">{{projChip}}{{prioChip}}</div>
                  </div>
                  <a class="btn" href="{{taskUrl}}">View Task &rarr;</a>
                </div>
                <div class="ftr">
                  Altuwijri Ticket System &mdash; Confidential &nbsp;&middot;&nbsp; This message was sent automatically. Do not reply.
                </div>
              </div>
            </body>
            </html>
            """;
    }
}
