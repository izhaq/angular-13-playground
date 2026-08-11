using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Tests;

/// <summary>
/// R1.5a — what <see cref="LockoutService"/> does when the mechanism is off.
///
/// The point of these tests is that "off" is answered by the SERVICE, not by
/// every caller: the endpoint keeps calling IsLocked/RecordFailure/Reset in
/// the same order, and gets "not locked / nothing counted" back. No caller has
/// to learn a second code path, and nothing reaches the LoginAttempts table.
/// </summary>
public class LockoutServiceDisabledTests : IDisposable
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly AuthDb _db;
    private readonly LockoutService _lockout;

    public LockoutServiceDisabledTests()
    {
        _connection.Open();
        _db = new AuthDb(new DbContextOptionsBuilder<AuthDb>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        _lockout = new LockoutService(_db, LockoutOptions.Off);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

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
    public async Task RecordFailure_counts_nothing_and_never_reports_a_lock()
    {
        for (var i = 0; i < 20; i++)
        {
            Assert.False(await _lockout.RecordFailure("operation"));
        }

        // Nothing stored: "off" means the table stays empty, not that the rows
        // are written and ignored.
        Assert.False(_db.LoginAttempts.AsNoTracking().Any());
    }

    [Fact]
    public async Task IsLocked_is_false_even_for_a_row_left_over_from_when_lockout_was_on()
    {
        // Turning the mechanism off is also the documented escape hatch for a
        // locked-out station, so an old lock must not keep biting.
        Store("operation", 5, DateTimeOffset.UtcNow.AddMinutes(30));

        Assert.False(await _lockout.IsLocked("operation"));
    }

    [Fact]
    public async Task Reset_touches_nothing()
    {
        // Every successful login calls Reset. With lockout off there is nothing
        // to reset, so it must not turn into a DELETE per login.
        Store("operation", 5, DateTimeOffset.UtcNow.AddMinutes(30));

        await _lockout.Reset("operation");

        Assert.True(_db.LoginAttempts.AsNoTracking().Any(a => a.Username == "operation"));
    }
}
