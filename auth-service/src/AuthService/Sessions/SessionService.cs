using System.Security.Cryptography;
using AuthService.Data;

namespace AuthService.Sessions;

/// <summary>Creates session rows. Lookup/delete arrive in later slices.</summary>
public class SessionService
{
    private readonly AuthDb _db;
    private readonly TimeSpan _ttl;

    public SessionService(AuthDb db, IConfiguration configuration)
    {
        _db = db;
        _ttl = TimeSpan.FromHours(configuration.GetValue("SessionTtlHours", 24));
    }

    public TimeSpan Ttl => _ttl;

    public async Task<Session> Create(string username, string mode, string position)
    {
        var session = new Session
        {
            Sid = NewSid(),
            Username = username,
            Mode = mode,
            Position = position,
            ExpiresAt = DateTimeOffset.UtcNow.Add(_ttl),
        };

        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }

    /// <summary>256 crypto-random bits, base64url so it is cookie-safe (no '=', '+', '/').</summary>
    private static string NewSid()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
