using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// R1.6a — time is a DEPENDENCY, not an ambient fact.
///
/// <see cref="SessionService"/> and <see cref="LockoutService"/> read the
/// clock they were handed, so "two hours from now" is decided by whoever owns
/// the clock. Production hands them <c>TimeProvider.System</c>; tests hand
/// them a <see cref="TestTimeProvider"/> and move it.
///
/// This suite pins the seam itself. The behaviors that RIDE on it — session
/// expiry, the lockout auto-unlock — stay in their own suites, now expressed
/// as clock advances instead of aged database rows.
/// </summary>
public class InjectedClockTests : IClassFixture<AuthServiceFactory>
{
    private readonly AuthServiceFactory _factory;

    public InjectedClockTests(AuthServiceFactory factory)
    {
        _factory = factory;
    }

    private static IConfiguration Configuration(params (string Key, string Value)[] settings) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(settings.Select(s => new KeyValuePair<string, string?>(s.Key, s.Value)))
            .Build();

    [Fact]
    public void Production_wiring_registers_the_system_clock()
    {
        // The whole point of the seam is that only TESTS substitute the clock.
        // A host that quietly ran on a frozen or fake clock would be a service
        // whose sessions never expire and whose locks never lift.
        Assert.Same(TimeProvider.System, _factory.Services.GetRequiredService<TimeProvider>());
    }

    [Fact]
    public async Task Session_expiry_is_stamped_from_the_injected_clock()
    {
        using var db = NewDb(out var connection);
        using (connection)
        {
            var clock = new TestTimeProvider();
            var sessions = new SessionService(db, Configuration(("SessionTtlHours", "2")), clock);

            var session = await sessions.Create("operation", "operation", "active");

            // Exactly the fake clock's now + the TTL: no tolerance window, no
            // reference to the wall clock at all.
            Assert.Equal(clock.GetUtcNow().AddHours(2), session.ExpiresAt);
        }
    }

    [Fact]
    public async Task A_session_is_live_until_the_clock_reaches_its_expiry()
    {
        using var db = NewDb(out var connection);
        using (connection)
        {
            var clock = new TestTimeProvider();
            var sessions = new SessionService(db, Configuration(("SessionTtlHours", "2")), clock);
            var session = await sessions.Create("operation", "operation", "active");

            clock.Advance(TimeSpan.FromMinutes(119));

            Assert.NotNull(await sessions.FindLive(session.Sid));
        }
    }

    [Fact]
    public async Task A_session_is_gone_once_the_clock_passes_its_expiry()
    {
        using var db = NewDb(out var connection);
        using (connection)
        {
            var clock = new TestTimeProvider();
            var sessions = new SessionService(db, Configuration(("SessionTtlHours", "2")), clock);
            var session = await sessions.Create("operation", "operation", "active");

            // The row is untouched — only the clock moved. Before R1.6a this
            // same assertion needed an UPDATE against the Sessions table.
            clock.Advance(TimeSpan.FromMinutes(121));

            Assert.Null(await sessions.FindLive(session.Sid));
        }
    }

    private static AuthDb NewDb(out SqliteConnection connection)
    {
        connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();
        var db = new AuthDb(new DbContextOptionsBuilder<AuthDb>().UseSqlite(connection).Options);
        db.Database.EnsureCreated();
        return db;
    }
}
