namespace AuthService.Tests;

/// <summary>
/// The clock a test drives by hand (R1.6a). Everything time-dependent in the
/// service — session expiry, the lockout window's auto-unlock — reads
/// <see cref="TimeProvider"/>, so a test can reach an expiry by MOVING THE
/// CLOCK instead of writing an aged row into the database. That was the only
/// place where tests manipulated storage to simulate the passage of time, and
/// it tested the row rather than the rule: a service that never looked at
/// LockedUntil would have passed just as well.
///
/// Hand-rolled rather than <c>FakeTimeProvider</c> from
/// Microsoft.Extensions.TimeProvider.Testing: the only thing under test here
/// is "what does the service think the time is", so the timer/task-scheduling
/// half of that package would be a new dependency bought for nothing.
///
/// Which is also the limit of this class: <see cref="GetUtcNow"/> is the ONLY
/// member overridden, so anything timer-shaped — <c>CreateTimer</c>,
/// <c>Delay</c>, <c>GetTimestamp</c> — silently falls through to
/// <see cref="TimeProvider"/>'s real-clock behaviour and would not follow
/// <see cref="Advance"/>. Nothing in the service uses those today; the day
/// something does, reach for <c>FakeTimeProvider</c> rather than extending
/// this, or the test will pass while measuring the wall clock.
/// <see cref="Advance"/> is interlocked because the race suites drive this
/// clock from more than one <c>LockoutService</c>.
/// </summary>
public sealed class TestTimeProvider : TimeProvider
{
    /// <summary>
    /// A fixed instant rather than "now", so a failure reads the same on every
    /// run and no test can accidentally depend on the wall clock.
    /// </summary>
    public static readonly DateTimeOffset DefaultStart =
        new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private long _utcTicks;

    public TestTimeProvider()
        : this(DefaultStart)
    {
    }

    public TestTimeProvider(DateTimeOffset start) => _utcTicks = start.UtcTicks;

    public override DateTimeOffset GetUtcNow() => new(Interlocked.Read(ref _utcTicks), TimeSpan.Zero);

    /// <summary>Moves the clock forward. Nothing here ever moves it back — time does not.</summary>
    public void Advance(TimeSpan by)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(by.Ticks, nameof(by));
        Interlocked.Add(ref _utcTicks, by.Ticks);
    }
}
