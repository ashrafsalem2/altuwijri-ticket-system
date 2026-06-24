using TaskFlow.Application.Common.Interfaces;

namespace TaskFlow.Infrastructure.Auth;

/// <summary>BCrypt-based password hashing.</summary>
public class PasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

    public bool Verify(string password, string hash)
    {
        try { return BCrypt.Net.BCrypt.Verify(password, hash); }
        catch { return false; }
    }
}
