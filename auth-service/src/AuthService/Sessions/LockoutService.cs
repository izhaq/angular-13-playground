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
///
/// Every method must survive parallel logins for the SAME username — that is
/// the traffic a retry limit exists to meet, not an edge case. Two rules
/// follow, and <see cref="AuthService.Tests"/>' race suite pins both:
/// - no counted failure may be lost (a lost failure is a free password guess);
/// - no race may escape as an exception, because the login contract only
///   answers 200/400/401/423 and a 500 would be a correct password refused.
/// </summary>
public class LockoutService
{
    /// <summary>
    /// How many times a counted failure re-reads and retries after losing a
    /// race. Three is plenty for two station users; the point of the bound is
    /// that a hot row can never spin forever.
    /// </summary>
    private const int MaxSaveRounds = 3;

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

        await Unlock(username);
        return false;
    }

    /// <summary>
    /// Counts one failed login. Returns true when the username is locked
    /// afterwards, so the caller can answer 423 on the attempt that caused the
    /// lock instead of leaving the user to discover it on the next.
    ///
    /// Safe to call on its own: an expired lock is forgotten before counting
    /// and a live one is never extended, so this does not depend on
    /// <see cref="IsLocked"/> having run first.
    /// </summary>
    public async Task<bool> RecordFailure(string username)
    {
        for (var round = 1; round <= MaxSaveRounds; round++)
        {
            if (round > 1)
            {
                // A retry must start from what is actually committed, not from
                // the values we failed to write, so drop the tracked state.
                _db.ChangeTracker.Clear();
            }

            var attempt = await _db.LoginAttempts.SingleOrDefaultAsync(a => a.Username == username);
            if (attempt is null)
            {
                attempt = new LoginAttempt { Username = username };
                _db.LoginAttempts.Add(attempt);
            }
            else if (attempt.LockedUntil is not null)
            {
                if (attempt.LockedUntil > DateTimeOffset.UtcNow)
                {
                    // Locked and still inside the window: counting this would
                    // push the window forward, so a bot hammering the endpoint
                    // could keep the real operator out forever.
                    return true;
                }

                // The window has passed. Whoever gets here first performs the
                // auto-unlock, then counts this failure as the first of a new
                // run — never as "one more" on top of the old, expired run.
                attempt.FailedCount = 0;
                attempt.LockedUntil = null;
            }

            attempt.FailedCount++;
            attempt.Version++;
            if (attempt.FailedCount >= _maxAttempts)
            {
                attempt.LockedUntil = DateTimeOffset.UtcNow.Add(_window);
            }

            try
            {
                await _db.SaveChangesAsync();
                return attempt.LockedUntil is not null;
            }
            catch (DbUpdateException)
            {
                // Both shapes of "a parallel failed login for this username got
                // here first" land in this one clause, since the concurrency
                // flavour derives from DbUpdateException:
                // - DbUpdateException wrapping a UNIQUE violation — we both saw
                //   no row and both inserted; the row exists now, so re-read
                //   and increment it;
                // - DbUpdateConcurrencyException — the token says our count was
                //   computed from a value that has since been replaced; re-read
                //   and increment the new one.
                // Either way the failure is counted on the next round, and
                // neither is ever allowed to reach the endpoint as a 500.
            }
        }

        // Rounds exhausted: the row is hot and other requests keep winning it.
        // Their failures are counted, so the limit still holds — answer from
        // what is committed rather than turning a wrong password into a 500.
        _db.ChangeTracker.Clear();
        return (await Find(username))?.LockedUntil is not null;
    }

    /// <summary>Forgets a username's failures — what a successful login earns.</summary>
    public async Task Reset(string username)
    {
        // One set-based DELETE: no fetch, no change tracking, nothing to go
        // stale between reading and writing. Two stations logging in at the
        // same moment simply both delete nothing-or-something; neither can
        // fail the way a tracked Remove + SaveChanges could (PR #29's bug in
        // SessionService.Delete, which this used to repeat). It also drops one
        // SELECT from every successful login.
        await _db.LoginAttempts
            .Where(a => a.Username == username)
            .ExecuteDeleteAsync();
    }

    /// <summary>
    /// Clears an expired lock and its count, set-based for the same reason as
    /// <see cref="Reset"/>. The Version bump makes any failed login that read
    /// the pre-unlock count re-read instead of writing a stale one.
    /// </summary>
    private async Task Unlock(string username)
    {
        await _db.LoginAttempts
            .Where(a => a.Username == username)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(a => a.LockedUntil, (DateTimeOffset?)null)
                .SetProperty(a => a.FailedCount, 0)
                .SetProperty(a => a.Version, a => a.Version + 1));
    }

    // Note for a real deployment: a row is created for every username ever
    // submitted, so a flood of invented usernames grows this table. Harmless
    // for two station users on a closed network; a periodic sweep of rows
    // with no live lock is the fix if this ever faces the open internet.
    //
    // Untracked on purpose: this is only ever a read, and the writes around it
    // are set-based, so nothing in this service can be left holding a stale
    // tracked copy of the row.
    private Task<LoginAttempt?> Find(string username) =>
        _db.LoginAttempts.AsNoTracking().SingleOrDefaultAsync(a => a.Username == username);
}
