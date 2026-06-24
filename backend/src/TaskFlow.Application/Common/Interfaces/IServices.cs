using System.Security.Claims;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Common.Interfaces;

/// <summary>Resolves the currently authenticated user from the request context.</summary>
public interface ICurrentUserService
{
    int? UserId { get; }
    string? UserName { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
}

/// <summary>Hashes and verifies user passwords.</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

/// <summary>Issues and validates JWT access tokens and refresh tokens.</summary>
public interface ITokenService
{
    (string token, DateTime expiresAt) CreateAccessToken(User user);
    string CreateRefreshToken();
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}

/// <summary>Stores uploaded attachment files.</summary>
public interface IFileStorage
{
    Task<string> SaveAsync(Stream content, string storedFileName, CancellationToken ct = default);
    Task<Stream?> OpenAsync(string storedFileName, CancellationToken ct = default);
    void Delete(string storedFileName);
}
