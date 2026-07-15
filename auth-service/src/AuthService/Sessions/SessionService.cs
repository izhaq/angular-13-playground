using System.Security.Cryptography;
using AuthService.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Sessions;

/// <summary>Creates and looks up session rows. Delete arrives in slice 3.</summary>
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

    /// <summary>
    /// The live session for a sid, or null when the sid is unknown or the
    /// session has expired. Rows are never purged, so an expired row is
    /// indistinguishable from a missing one — both mean "no session".
    /// </summary>
    public async Task<Session?> FindLive(string sid)
    {
        var session = await _db.Sessions.SingleOrDefaultAsync(s => s.Sid == sid);
        return session is not null && session.ExpiresAt > DateTimeOffset.UtcNow ? session : null;
    }

    /// <summary>256 crypto-random bits, base64url so it is cookie-safe (no '=', '+', '/').</summary>
    private static string NewSid()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
