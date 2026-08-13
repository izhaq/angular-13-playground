using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AuthService.Tests;

/// <summary>
/// <see cref="SessionService.Delete"/> must be a quiet no-op for a sid that is
/// unknown, already deleted, or deleted concurrently — the logout contract is
/// "always 204, idempotent".
///
/// Delete used to fetch the row and then save its removal, which left a race
/// window: a concurrent logout could delete the row in between and EF's
/// SaveChanges would throw DbUpdateConcurrencyException (an earlier version of
/// this file — SessionServiceDeleteRaceTests — reproduced exactly that with a
/// SaveChangesInterceptor). Delete is now a single set-based DELETE, so there
/// is no fetch-then-save window left to open deterministically, and these
/// tests pin the observable guarantee instead: already-gone is a no-op, never
/// an exception.
///
/// Be aware of what that means for coverage: a regression BACK to
/// fetch-then-save without the concurrency catch would still pass these tests
/// (nothing here can race inside the operation anymore). The set-based shape
/// of Delete itself is the safety property — reviewers must guard it, the way
/// <c>LockoutService.Forget</c> documents the same rule.
/// </summary>
public class SessionServiceDeleteTests
{
    private static SqliteConnection OpenDatabase()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        using var setup = new AuthDb(
            new DbContextOptionsBuilder<AuthDb>().UseSqlite(connection).Options);
        setup.Database.EnsureCreated();

        return connection;
    }

    private static AuthDb CreateDb(SqliteConnection connection) =>
        new(new DbContextOptionsBuilder<AuthDb>().UseSqlite(connection).Options);

    [Fact]
    public async Task Delete_does_not_throw_when_a_concurrent_logout_already_deleted_the_row()
    {
        using var connection = OpenDatabase();
        using var db = CreateDb(connection);
        var sessions = new SessionService(db, new ConfigurationBuilder().Build(), TimeProvider.System);

        var session = await sessions.Create("operation", "operation", "active");

        // The "concurrent logout": the row disappears underneath the service,
        // out of band, before our Delete runs.
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "DELETE FROM Sessions WHERE Sid = $sid";
            command.Parameters.AddWithValue("$sid", session.Sid);
            command.ExecuteNonQuery();
        }

        var exception = await Record.ExceptionAsync(() => sessions.Delete(session.Sid));

        // The loser of the race must treat "already deleted" as a no-op…
        Assert.Null(exception);

        // …and either way the row is gone.
        Assert.False(await db.Sessions.AsNoTracking().AnyAsync(s => s.Sid == session.Sid));
    }

    [Fact]
    public async Task Delete_twice_for_the_same_sid_is_a_quiet_no_op_the_second_time()
    {
        using var connection = OpenDatabase();
        using var db = CreateDb(connection);
        var sessions = new SessionService(db, new ConfigurationBuilder().Build(), TimeProvider.System);

        var session = await sessions.Create("operation", "operation", "active");

        await sessions.Delete(session.Sid);
        var exception = await Record.ExceptionAsync(() => sessions.Delete(session.Sid));

        Assert.Null(exception);
        Assert.False(await db.Sessions.AsNoTracking().AnyAsync(s => s.Sid == session.Sid));
    }
}
