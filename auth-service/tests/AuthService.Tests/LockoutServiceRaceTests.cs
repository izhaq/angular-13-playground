using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AuthService.Tests;

/// <summary>
/// Deterministic reproductions of the concurrent-login races in
/// <see cref="LockoutService"/> — the same house pattern as
/// <see cref="SessionServiceDeleteRaceTests"/>: a SaveChangesInterceptor opens
/// the race window on purpose, so nothing here depends on thread timing.
///
/// The "other request" is not hand-written SQL but a second
/// <see cref="LockoutService"/> over its own DbContext on the same database —
/// exactly what a second HTTP request does — so these tests stay honest about
/// what really competes for the row.
///
/// Two properties are load-bearing, and both are security properties:
/// - no failure may be LOST, or an attacker with N parallel connections gets
///   materially more than MaxLoginAttempts guesses per window;
/// - no race may escape as a 500, because the login contract only ever
///   answers 200/400/401/423.
/// </summary>
public class LockoutServiceRaceTests : IDisposable
{
    private const int MaxAttempts = 5;

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly List<AuthDb> _contexts = new();

    public LockoutServiceRaceTests()
    {
        _connection.Open();
        using var setup = new AuthDb(Options());
        setup.Database.EnsureCreated();
    }

    public void Dispose()
    {
        foreach (var context in _contexts)
        {
            context.Dispose();
        }

        _connection.Dispose();
    }

    /// <summary>
    /// Plays the part of the concurrent request: when armed, runs the given
    /// work inside the window between the service's fetch (already done by the
    /// time SaveChanges starts) and its UPDATE/INSERT/DELETE statement.
    /// Disarms after one use so a retry is not raced again forever.
    /// </summary>
    private sealed class ConcurrentRequestInterceptor : SaveChangesInterceptor
    {
        public Func<Task>? OtherRequest { get; set; }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            var other = OtherRequest;
            if (other is not null)
            {
                OtherRequest = null;
                other().GetAwaiter().GetResult();
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }

    private DbContextOptions<AuthDb> Options(IInterceptor? interceptor = null)
    {
        var builder = new DbContextOptionsBuilder<AuthDb>().UseSqlite(_connection);
        if (interceptor is not null)
        {
            builder.AddInterceptors(interceptor);
        }

        return builder.Options;
    }

    private static LockoutOptions Policy => LockoutOptions.On(MaxAttempts, TimeSpan.FromMinutes(15));

    /// <summary>A lockout service on its own context — one "request".</summary>
    private LockoutService Request(IInterceptor? interceptor = null)
    {
        var db = new AuthDb(Options(interceptor));
        _contexts.Add(db);
        return new LockoutService(db, Policy);
    }

    private int FailedCount(string username)
    {
        using var db = new AuthDb(Options());
        return db.LoginAttempts.AsNoTracking().Single(a => a.Username == username).FailedCount;
    }

    private bool RowExists(string username)
    {
        using var db = new AuthDb(Options());
        return db.LoginAttempts.AsNoTracking().Any(a => a.Username == username);
    }

    [Fact]
    public async Task RecordFailure_counts_both_when_a_concurrent_failure_inserts_the_row_first()
    {
        // The insert race: two requests both see NO row for a fresh username
        // and both INSERT. One wins; the loser used to die on the primary key
        // (SqliteException: UNIQUE constraint failed) and answered 500.
        var interceptor = new ConcurrentRequestInterceptor();
        var lockout = Request(interceptor);
        var other = Request();

        interceptor.OtherRequest = () => other.RecordFailure("fresh-username");

        var exception = await Record.ExceptionAsync(() => lockout.RecordFailure("fresh-username"));

        Assert.Null(exception);

        // BOTH failures must be counted. Losing one is not a cosmetic bug:
        // every lost failure is a free extra password guess.
        Assert.Equal(2, FailedCount("fresh-username"));
    }

    [Fact]
    public async Task RecordFailure_counts_both_when_a_concurrent_failure_updates_the_row()
    {
        // The update race: both requests read FailedCount = 1, both write 2,
        // and one increment vanishes. The concurrency token turns that silent
        // lost update into a detected conflict the retry can absorb.
        await Request().RecordFailure("operation");

        var interceptor = new ConcurrentRequestInterceptor();
        var lockout = Request(interceptor);
        var other = Request();

        interceptor.OtherRequest = () => other.RecordFailure("operation");

        var exception = await Record.ExceptionAsync(() => lockout.RecordFailure("operation"));

        Assert.Null(exception);
        Assert.Equal(3, FailedCount("operation")); // 1 seeded + 1 concurrent + 1 ours
    }

    [Fact]
    public async Task RecordFailure_locks_after_max_attempts_even_when_every_attempt_is_raced()
    {
        // The end-to-end security property: N failures still means N counted
        // failures, so the limit holds under exactly the parallel traffic it
        // exists to stop.
        for (var i = 0; i < MaxAttempts; i += 2)
        {
            var interceptor = new ConcurrentRequestInterceptor();
            var lockout = Request(interceptor);
            var other = Request();
            interceptor.OtherRequest = () => other.RecordFailure("racer");
            await lockout.RecordFailure("racer");
        }

        Assert.True(await Request().IsLocked("racer"));
    }

    [Fact]
    public async Task Reset_does_not_throw_when_the_row_disappears_inside_the_save_window()
    {
        // Two stations logging in at the same moment both reset the same
        // username. The loser must not turn a correct password into a 500.
        //
        // Once Reset is a single set-based DELETE there is no fetch-then-save
        // window left for the interceptor to fire in — which is the point:
        // the window it used to arm no longer exists.
        await Request().RecordFailure("operation");

        var interceptor = new ConcurrentRequestInterceptor();
        var lockout = Request(interceptor);
        var other = Request();

        interceptor.OtherRequest = () => other.Reset("operation");

        var exception = await Record.ExceptionAsync(() => lockout.Reset("operation"));

        Assert.Null(exception);
        Assert.False(RowExists("operation"));
    }

    [Fact]
    public async Task Reset_does_not_throw_when_the_row_is_already_gone()
    {
        // The other order of the same race: the concurrent login won outright.
        await Request().RecordFailure("operation");
        await Request().Reset("operation");

        var exception = await Record.ExceptionAsync(() => Request().Reset("operation"));

        Assert.Null(exception);
        Assert.False(RowExists("operation"));
    }

    [Fact]
    public async Task IsLocked_does_not_throw_when_the_auto_unlock_write_is_raced()
    {
        // Auto-unlock writes to the same row, so it races the same way: two
        // logins arriving just after the window closes both clear the lock.
        var seeded = Request();
        for (var i = 0; i < MaxAttempts; i++)
        {
            await seeded.RecordFailure("operation");
        }

        using (var db = new AuthDb(Options()))
        {
            var attempt = db.LoginAttempts.Single(a => a.Username == "operation");
            attempt.LockedUntil = DateTimeOffset.UtcNow.AddMinutes(-1);
            db.SaveChanges();
        }

        var interceptor = new ConcurrentRequestInterceptor();
        var lockout = Request(interceptor);
        var other = Request();

        interceptor.OtherRequest = () => other.Reset("operation");

        bool? locked = null;
        var exception = await Record.ExceptionAsync(async () => locked = await lockout.IsLocked("operation"));

        Assert.Null(exception);
        Assert.False(locked); // the window had passed, so the answer is "not locked"
    }
}
