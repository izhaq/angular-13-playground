namespace AuthService.Data;

/// <summary>
/// The consecutive-failure tally for one SUBMITTED username (R1.4) — the row
/// exists whether or not that username is a real user, because a lock that
/// only real usernames could earn would turn 423-vs-401 into a way to ask
/// "does this account exist?".
///
/// It lives in the database rather than in memory on purpose: a restart of
/// the service must not hand an attacker a fresh set of tries.
/// </summary>
public class LoginAttempt
{
    /// <summary>The submitted username — primary key. Never a password.</summary>
    public string Username { get; set; } = null!;

    /// <summary>Failures since the last success or unlock.</summary>
    public int FailedCount { get; set; }

    /// <summary>When the lock lifts, or null when not locked.</summary>
    public DateTimeOffset? LockedUntil { get; set; }
}
