using System.Security.Cryptography;
using AuthService.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Sessions;

/// <summary>Creates, looks up, and deletes session rows.</summary>
public class SessionService
{
    /// <summary>
    /// Cookie lifetime when sessions never expire (R1.2). It cannot be
    /// omitted — a cookie with no Max-Age is a session cookie, which the
    /// browser drops on restart, and a station reboot must not log the
    /// station out. ~10 years is "forever" in station terms.
    /// </summary>
    private static readonly TimeSpan ForeverishCookieAge = TimeSpan.FromDays(3650);

    private readonly AuthDb _db;
    private readonly TimeProvider _clock;
    private readonly TimeSpan? _ttl;

    /// <summary>
    /// The clock arrives as a dependency (R1.6a) rather than being read from
    /// <c>DateTimeOffset.UtcNow</c>: expiry is this class's whole time-
    /// dependent rule, and a test that wants to reach an expiry should move
    /// the clock, not rewrite the row it is testing.
    /// </summary>
    public SessionService(AuthDb db, IConfiguration configuration, TimeProvider clock)
    {
        _db = db;
        _clock = clock;

        // Unset (the default since R1.2) means sessions never expire.
        // A number restores the pre-R1.2 timed behavior, unchanged.
        var ttlHours = configuration.GetValue<double?>("SessionTtlHours");
        _ttl = ttlHours is null ? null : TimeSpan.FromHours(ttlHours.Value);
    }

    /// <summary>
    /// How long the sid cookie should live. With expiry off this is the long
    /// fixed lifetime; with a TTL configured it matches the TTL exactly, so
    /// cookie and session row always agree.
    /// </summary>
    public TimeSpan CookieMaxAge => _ttl ?? ForeverishCookieAge;

    public async Task<Session> Create(string username, string mode, string position)
    {
        var session = new Session
        {
            Sid = NewSid(),
            Username = username,
            Mode = mode,
            Position = position,
            ExpiresAt = _ttl is null ? null : _clock.GetUtcNow().Add(_ttl.Value),
        };

        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }

    /// <summary>
    /// The live session for a sid, or null when the sid is unknown or the
    /// session has expired. Rows are never purged, so an expired row is
    /// indistinguishable from a missing one — both mean "no session".
    /// A row with no ExpiresAt never expires (R1.2): only logout, which
    /// deletes the row, can end it.
    /// </summary>
    public async Task<Session?> FindLive(string sid)
    {
        var session = await _db.Sessions.SingleOrDefaultAsync(s => s.Sid == sid);
        if (session is null)
        {
            return null;
        }

        return session.ExpiresAt is null || session.ExpiresAt > _clock.GetUtcNow() ? session : null;
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
