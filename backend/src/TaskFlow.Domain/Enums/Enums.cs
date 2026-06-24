namespace TaskFlow.Domain.Enums;

/// <summary>Workflow stage of a task (used for the Kanban board).</summary>
public enum WorkTaskStatus
{
    Backlog = 0,
    ToDo = 1,
    InProgress = 2,
    InReview = 3,
    Blocked = 4,
    Done = 5,
    Cancelled = 6
}

/// <summary>Business priority of a task.</summary>
public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

/// <summary>Category of work, typical for an IT department.</summary>
public enum TaskType
{
    Task = 0,
    Bug = 1,
    Incident = 2,
    ServiceRequest = 3,
    Feature = 4,
    Maintenance = 5,
    Change = 6
}

/// <summary>Project lifecycle state.</summary>
public enum ProjectStatus
{
    Planning = 0,
    Active = 1,
    OnHold = 2,
    Completed = 3,
    Archived = 4
}

/// <summary>Kind of attachment linked to a task.</summary>
public enum AttachmentKind
{
    File = 0,
    Image = 1,
    Link = 2
}

/// <summary>State of a support chat conversation.</summary>
public enum ChatStatus
{
    Open = 0,
    Closed = 1
}

/// <summary>Categories of notifications surfaced to a user.</summary>
public enum NotificationType
{
    TaskAssigned = 0,
    TaskUpdated = 1,
    TaskCommented = 2,
    TaskStatusChanged = 3,
    TaskDueSoon = 4,
    TaskOverdue = 5,
    Mention = 6,
    System = 7
}
