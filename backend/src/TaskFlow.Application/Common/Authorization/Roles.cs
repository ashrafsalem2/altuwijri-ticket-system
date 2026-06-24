namespace TaskFlow.Application.Common.Authorization;

/// <summary>Canonical role names used across the application for authorization.</summary>
public static class Roles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Technician = "Technician";
    public const string Viewer = "Viewer";
    public const string Employee = "Employee";

    public static readonly string[] All = [Admin, Manager, Technician, Viewer, Employee];
}
