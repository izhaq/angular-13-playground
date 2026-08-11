using AuthService.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Sessions;

/// <summary>
/// The login retry limit (R1.4, spec "Lockout policy"): counts consecutive
/// failures per submitted username and refuses logins for a while once the
/// count reaches the limit.
///
/// Everything here keys off the username the caller TYPED, never off a user
/// row, so an unknown username locks exactly like a real one and 423-vs-401
/// leaks nothing about which accounts exist.
/// </summary>
public class LockoutService
{
    private readonly AuthDb _db;
    private readonly int _maxAttempts;
    private readonly TimeSpan _window;

    public LockoutService(AuthDb db, IConfiguration configuration)
    {
        _db = db;
        _maxAttempts = configuration.GetValue("MaxLoginAttempts", 5);
        _window = TimeSpan.FromMinutes(configuration.GetValue("LockoutMinutes", 15.0));
    }

    /// <summary>
    /// Whether logins for this username are currently refused. A lock whose
    /// window has passed is cleared here — that is the auto-unlock — and the
    /// failure count goes with it, so the user starts clean rather than one
    /// slip away from being locked out again.
    /// </summary>
    public async Task<bool> IsLocked(string username)
    {
        var attempt = await Find(username);
        if (attempt?.LockedUntil is null)
        {
            return false;
        }

        if (attempt.LockedUntil > DateTimeOffset.UtcNow)
        {
            return true;
        }

        attempt.LockedUntil = null;
        attempt.FailedCount = 0;
        await _db.SaveChangesAsync();
        return false;
    }

    /// <summary>
    /// Counts one failed login. Returns true when this failure is the one
    /// that trips the limit, so the caller can answer 423 on the attempt that
    /// caused the lock instead of leaving the user to discover it on the next.
    /// </summary>
    public async Task<bool> RecordFailure(string username)
    {
        var attempt = await Find(username);
        if (attempt is null)
        {
            attempt = new LoginAttempt { Username = username };
            _db.LoginAttempts.Add(attempt);
        }

        attempt.FailedCount++;
        if (attempt.FailedCount >= _maxAttempts)
        {
            attempt.LockedUntil = DateTimeOffset.UtcNow.Add(_window);
        }

        await _db.SaveChangesAsync();
        return attempt.LockedUntil is not null;
    }

    /// <summary>Forgets a username's failures — what a successful login earns.</summary>
    public async Task Reset(string username)
    {
        var attempt = await Find(username);
        if (attempt is null)
        {
            return;
        }

        _db.LoginAttempts.Remove(attempt);
        await _db.SaveChangesAsync();
    }

    // Note for a real deployment: a row is created for every username ever
    // submitted, so a flood of invented usernames grows this table. Harmless
    // for two station users on a closed network; a periodic sweep of rows
    // with no live lock is the fix if this ever faces the open internet.
    private Task<LoginAttempt?> Find(string username) =>
        _db.LoginAttempts.SingleOrDefaultAsync(a => a.Username == username);
}
