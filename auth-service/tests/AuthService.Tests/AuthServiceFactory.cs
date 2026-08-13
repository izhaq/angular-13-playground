using AuthService.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// Boots the real <c>Program</c> (including EF schema creation + seeding)
/// against a private SQLite in-memory database, so tests are hermetic and
/// never touch the dev <c>auth.db</c> file. The connection must stay open for
/// the factory's lifetime — closing it would drop the in-memory database.
/// </summary>
public class AuthServiceFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _connection.Open();
        builder.ConfigureServices(services =>
        {
            var descriptor = services.Single(
                d => d.ServiceType == typeof(DbContextOptions<AuthDb>));
            services.Remove(descriptor);
            services.AddDbContext<AuthDb>(options => options.UseSqlite(_connection));
        });
    }

    /// <summary>
    /// The same host with the clock under the test's control (R1.6a). The
    /// default host keeps <c>TimeProvider.System</c> — production's clock —
    /// so only the tests that need to travel in time pay for a fake one, and
    /// the wiring test can still see what production registers.
    /// </summary>
    public WebApplicationFactory<Program> WithClock(
        TimeProvider clock, Action<IWebHostBuilder>? alsoConfigure = null) =>
        WithWebHostBuilder(builder =>
        {
            alsoConfigure?.Invoke(builder);
            builder.ConfigureServices(services => services.AddSingleton(clock));
        });

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection.Dispose();
    }
}
