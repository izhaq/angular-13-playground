using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace AuthService.Tests;

/// <summary>
/// Deterministic reproduction of the concurrent double-delete race in
/// <see cref="SessionService.Delete"/>: request A fetches the session row,
/// request B deletes it, then A's SaveChanges finds zero rows affected and EF
/// throws DbUpdateConcurrencyException — which must NOT escape, because the
/// logout contract is "always 204, idempotent".
///
/// A true parallel test would be flaky by nature, so the race window is opened
/// deterministically instead: a SaveChangesInterceptor deletes the row out
/// from under EF after Delete's fetch but before its SaveChangesAsync runs.
/// </summary>
public class SessionServiceDeleteRaceTests
{
    /// <summary>
    /// Plays the part of the concurrent request: when armed, deletes the
    /// session row via a raw command in the window between Delete's fetch
    /// (already done by the time SaveChanges starts) and EF's DELETE statement.
    /// </summary>
    private sealed class ConcurrentDeleteInterceptor : SaveChangesInterceptor
    {
        private readonly SqliteConnection _connection;

        public ConcurrentDeleteInterceptor(SqliteConnection connection)
        {
            _connection = connection;
        }

        /// <summary>Sid to delete out-of-band on the next SaveChanges; disarmed after one use.</summary>
        public string? SidToDeleteUnderneath { get; set; }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (SidToDeleteUnderneath is not null)
            {
                using var command = _connection.CreateCommand();
                command.CommandText = "DELETE FROM Sessions WHERE Sid = $sid";
                command.Parameters.AddWithValue("$sid", SidToDeleteUnderneath);
                command.ExecuteNonQuery();
                SidToDeleteUnderneath = null;
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }

    [Fact]
    public async Task Delete_does_not_throw_when_the_row_is_deleted_between_fetch_and_save()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        using (var setup = new AuthDb(
            new DbContextOptionsBuilder<AuthDb>().UseSqlite(connection).Options))
        {
            setup.Database.EnsureCreated();
        }

        var interceptor = new ConcurrentDeleteInterceptor(connection);
        using var db = new AuthDb(new DbContextOptionsBuilder<AuthDb>()
            .UseSqlite(connection)
            .AddInterceptors(interceptor)
            .Options);
        var sessions = new SessionService(db, new ConfigurationBuilder().Build());

        var session = await sessions.Create("operation", "operation", "active");

        // Arm the "concurrent logout": it fires inside the next SaveChanges,
        // after Delete has already fetched and marked the row for removal.
        interceptor.SidToDeleteUnderneath = session.Sid;

        var exception = await Record.ExceptionAsync(() => sessions.Delete(session.Sid));

        // The loser of the race must treat "already deleted" as a no-op…
        Assert.Null(exception);

        // …and either way the row is gone.
        Assert.False(await db.Sessions.AsNoTracking().AnyAsync(s => s.Sid == session.Sid));
    }
}
