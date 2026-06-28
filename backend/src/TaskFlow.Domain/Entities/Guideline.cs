using TaskFlow.Domain.Common;

namespace TaskFlow.Domain.Entities;

public class Guideline : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
