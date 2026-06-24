namespace TaskFlow.Application.Common.Interfaces;

public interface IWhatsAppService
{
    Task SendTaskAssignedAsync(
        string toPhone, string toName,
        string taskTitle, int taskId,
        string priority, string projectName,
        CancellationToken ct = default);
}
