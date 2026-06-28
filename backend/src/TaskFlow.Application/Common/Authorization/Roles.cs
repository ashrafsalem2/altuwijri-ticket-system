namespace TaskFlow.Application.Common.Authorization;

public static class Roles
{
    public const string Admin          = "Admin";
    public const string Technician     = "Technician";
    public const string BranchEmployee = "Branch-Employee";
    public const string HoEmployee     = "HO-Employee";
    public const string CamEmployee    = "Cam-Employee";

    // Convenience composites for [Authorize] attributes
    public const string AllStaff      = $"{Admin},{Technician}";
    public const string AllEmployees  = $"{BranchEmployee},{HoEmployee},{CamEmployee}";
    public const string AllRoles      = $"{Admin},{Technician},{BranchEmployee},{HoEmployee},{CamEmployee}";

    public static readonly string[] All          = [Admin, Technician, BranchEmployee, HoEmployee, CamEmployee];
    public static readonly string[] EmployeeRoles = [BranchEmployee, HoEmployee, CamEmployee];
}
