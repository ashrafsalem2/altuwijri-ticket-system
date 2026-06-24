namespace TaskFlow.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendTaskAssignedAsync(
        string toEmail, string toName,
        string taskTitle, int taskId,
        string priority, string projectName,
        CancellationToken ct = default);
}
