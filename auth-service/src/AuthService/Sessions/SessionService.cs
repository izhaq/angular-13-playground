using System.Security.Cryptography;
using AuthService.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Sessions;

/// <summary>Creates, looks up, and deletes session rows.</summary>
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

    /// <summary>
    /// Deletes the session row for a sid. Idempotent: an unknown or already
    /// deleted sid is a no-op — logout has nothing to reveal.
    /// </summary>
    public async Task Delete(string sid)
    {
        var session = await _db.Sessions.SingleOrDefaultAsync(s => s.Sid == sid);
        if (session is not null)
        {
            _db.Sessions.Remove(session);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // A concurrent logout deleted the row between our fetch and
                // save — already deleted, idempotent no-op.
            }
        }
    }

    /// <summary>256 crypto-random bits, base64url so it is cookie-safe (no '=', '+', '/').</summary>
    private static string NewSid()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
