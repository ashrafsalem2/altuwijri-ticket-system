namespace TaskFlow.Application.Common.Exceptions;

/// <summary>Base type for expected application errors mapped to HTTP responses.</summary>
public abstract class AppException(string message) : Exception(message)
{
    public abstract int StatusCode { get; }
}

/// <summary>Thrown when a requested resource does not exist (404).</summary>
public class NotFoundException(string resource, object key)
    : AppException($"{resource} with key '{key}' was not found.")
{
    public override int StatusCode => 404;
}

/// <summary>Thrown when a business rule or unique constraint is violated (409).</summary>
public class ConflictException(string message) : AppException(message)
{
    public override int StatusCode => 409;
}

/// <summary>Thrown when the caller is not allowed to perform an action (403).</summary>
public class ForbiddenException(string message = "You are not allowed to perform this action.")
    : AppException(message)
{
    public override int StatusCode => 403;
}

/// <summary>Thrown for invalid input not caught by model validation (400).</summary>
public class BadRequestException(string message) : AppException(message)
{
    public override int StatusCode => 400;
}
