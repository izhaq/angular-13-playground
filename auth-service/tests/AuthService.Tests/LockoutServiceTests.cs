using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Tests;

/// <summary>
/// Unit-level rules of <see cref="LockoutService"/>. <see cref="LoginLockoutTests"/>
/// covers the policy through HTTP, in the order the endpoint happens to call
/// these methods; this suite calls each method ON ITS OWN, because a method
/// that is only correct when its sibling ran first is a trap for the next
/// caller (an admin endpoint, a background job, a reordered handler).
/// </summary>
public class LockoutServiceTests : IDisposable
{
    private const int MaxAttempts = 3;

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly AuthDb _db;
    private readonly LockoutService _lockout;

    public LockoutServiceTests()
    {
        _connection.Open();
        _db = new AuthDb(new DbContextOptionsBuilder<AuthDb>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        _lockout = new LockoutService(_db, LockoutOptions.On(MaxAttempts, TimeSpan.FromMinutes(15)));
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private LoginAttempt Row(string username) =>
        _db.LoginAttempts.AsNoTracking().Single(a => a.Username == username);

    private void Store(string username, int failedCount, DateTimeOffset? lockedUntil)
    {
        _db.LoginAttempts.Add(new LoginAttempt
        {
            Username = username,
            FailedCount = failedCount,
            LockedUntil = lockedUntil,
        });
        _db.SaveChanges();
        _db.ChangeTracker.Clear();
    }

    [Fact]
    public async Task IsLocked_is_false_for_a_username_that_has_never_failed()
    {
        Assert.False(await _lockout.IsLocked("nobody"));
    }

    [Fact]
    public async Task IsLocked_is_true_while_the_window_is_open()
    {
        Store("operation", MaxAttempts, DateTimeOffset.UtcNow.AddMinutes(5));

        Assert.True(await _lockout.IsLocked("operation"));
    }

    [Fact]
    public async Task IsLocked_clears_an_expired_lock_and_its_count()
    {
        Store("operation", MaxAttempts, DateTimeOffset.UtcNow.AddMinutes(-1));

        Assert.False(await _lockout.IsLocked("operation"));

        // The count goes with the lock, otherwise one slip after the window
        // would snap the lock straight back shut.
        Assert.Equal(0, Row("operation").FailedCount);
        Assert.Null(Row("operation").LockedUntil);
    }

    [Fact]
    public async Task RecordFailure_counts_up_to_the_limit_and_only_then_locks()
    {
        Assert.False(await _lockout.RecordFailure("operation"));
        Assert.False(await _lockout.RecordFailure("operation"));

        // The Nth consecutive failure is itself answered 423, so the caller
        // learns why on the attempt that caused the lock, not on the next one.
        Assert.True(await _lockout.RecordFailure("operation"));
        Assert.Equal(MaxAttempts, Row("operation").FailedCount);
        Assert.NotNull(Row("operation").LockedUntil);
    }

    [Fact]
    public async Task RecordFailure_forgets_an_expired_lock_before_counting()
    {
        // Order-coupling guard: called on its own against a lock whose window
        // has passed, RecordFailure used to see the stale LockedUntil, add one
        // to an old count, and report "locked" after a SINGLE failure.
        Store("operation", MaxAttempts, DateTimeOffset.UtcNow.AddMinutes(-1));

        var locked = await _lockout.RecordFailure("operation");

        Assert.False(locked);
        Assert.Equal(1, Row("operation").FailedCount); // counting restarted
        Assert.Null(Row("operation").LockedUntil);
    }

    [Fact]
    public async Task RecordFailure_does_not_extend_a_live_lock()
    {
        // Otherwise a bot hammering the endpoint would keep the real operator
        // locked out forever. The endpoint checks IsLocked first today, but
        // the rule must not depend on that.
        var lockedUntil = DateTimeOffset.UtcNow.AddMinutes(5);
        Store("operation", MaxAttempts, lockedUntil);

        Assert.True(await _lockout.RecordFailure("operation"));

        Assert.Equal(MaxAttempts, Row("operation").FailedCount);
        Assert.Equal(lockedUntil.ToUnixTimeMilliseconds(), Row("operation").LockedUntil!.Value.ToUnixTimeMilliseconds());
    }

    [Fact]
    public async Task RecordFailure_tracks_a_username_that_does_not_exist_as_a_user()
    {
        // 423-vs-401 must not answer "does this account exist?".
        Assert.False(await _lockout.RecordFailure("nobody-at-all"));
        Assert.Equal(1, Row("nobody-at-all").FailedCount);
    }

    [Fact]
    public async Task Reset_forgets_the_failures()
    {
        await _lockout.RecordFailure("operation");

        await _lockout.Reset("operation");

        Assert.False(_db.LoginAttempts.AsNoTracking().Any(a => a.Username == "operation"));
    }

    [Fact]
    public async Task Reset_is_a_no_op_for_a_username_with_no_failures()
    {
        Assert.Null(await Record.ExceptionAsync(() => _lockout.Reset("nobody")));
    }

    [Fact]
    public async Task Unlock_releases_a_live_lock()
    {
        // The manual release (R1.5b), shared by the CLI and the admin
        // endpoint. Unlike the auto-unlock it does not wait for the window.
        Store("operation", MaxAttempts, DateTimeOffset.UtcNow.AddMinutes(15));

        await _lockout.Unlock("operation");

        Assert.False(await _lockout.IsLocked("operation"));
    }

    [Fact]
    public async Task Unlock_forgets_the_counter_as_well_as_the_lock()
    {
        // Releasing only the lock would leave the user one failure away from
        // being locked straight back out.
        Store("operation", MaxAttempts, DateTimeOffset.UtcNow.AddMinutes(15));

        await _lockout.Unlock("operation");

        Assert.False(await _lockout.RecordFailure("operation"));
        Assert.Equal(1, Row("operation").FailedCount);
    }

    [Fact]
    public async Task Unlock_is_a_no_op_for_a_username_that_was_never_locked()
    {
        // Idempotent by design: the operator running it should not have to
        // know the account's state, and the endpoint answers 204 either way.
        Assert.Null(await Record.ExceptionAsync(() => _lockout.Unlock("nobody")));
    }

    [Fact]
    public async Task Each_username_is_counted_on_its_own()
    {
        for (var i = 0; i < MaxAttempts; i++)
        {
            await _lockout.RecordFailure("operation");
        }

        Assert.True(await _lockout.IsLocked("operation"));
        Assert.False(await _lockout.IsLocked("technician"));
    }
}
