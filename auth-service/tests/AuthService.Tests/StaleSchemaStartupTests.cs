using AuthService.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// The operational trap behind R1: schema management is
/// <c>EnsureCreated</c>, which does NOTHING to a database file that already
/// exists. Any machine that ran slices 0–4 has an <c>auth.db</c> without the
/// <c>LoginAttempts</c> table, so — because the lock is checked before the
/// credential lookup — EVERY login on that machine answers 500, correct
/// password included.
///
/// A service that boots happily into a state where nothing can work is the
/// bug. Booting must fail fast instead, saying which file to delete.
/// </summary>
public class StaleSchemaStartupTests
{
    /// <summary>
    /// Boots the real Program against a database that already carries the
    /// pre-R1 schema: Users and Sessions exist (so EnsureCreated stands down),
    /// LoginAttempts does not, and Sessions.ExpiresAt is still NOT NULL.
    /// </summary>
    private sealed class StaleSchemaFactory : WebApplicationFactory<Program>
    {
        private readonly SqliteConnection _connection = new("DataSource=:memory:");

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            _connection.Open();
            using (var command = _connection.CreateCommand())
            {
                command.CommandText = """
                    CREATE TABLE "Users" (
                        "Username" TEXT NOT NULL CONSTRAINT "PK_Users" PRIMARY KEY,
                        "PasswordHash" TEXT NOT NULL);
                    CREATE TABLE "Sessions" (
                        "Sid" TEXT NOT NULL CONSTRAINT "PK_Sessions" PRIMARY KEY,
                        "Username" TEXT NOT NULL,
                        "Mode" TEXT NOT NULL,
                        "Position" TEXT NOT NULL,
                        "ExpiresAt" TEXT NOT NULL);
                    """;
                command.ExecuteNonQuery();
            }

            builder.ConfigureServices(services =>
            {
                var descriptor = services.Single(d => d.ServiceType == typeof(DbContextOptions<AuthDb>));
                services.Remove(descriptor);
                services.AddDbContext<AuthDb>(options => options.UseSqlite(_connection));
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            _connection.Dispose();
        }
    }

    [Fact]
    public void Startup_fails_fast_on_a_database_that_predates_the_lockout_table()
    {
        using var factory = new StaleSchemaFactory();

        var exception = Record.Exception(() => factory.CreateClient());

        // Loud at startup, in one place, instead of a 500 per login forever.
        Assert.NotNull(exception);

        var report = exception!.ToString();
        Assert.Contains("LoginAttempts", report);      // what is missing
        Assert.Contains("ExpiresAt", report);          // and the nullability R1.2 relaxed
        Assert.Contains("delete", report, StringComparison.OrdinalIgnoreCase); // and what to do
    }
}
