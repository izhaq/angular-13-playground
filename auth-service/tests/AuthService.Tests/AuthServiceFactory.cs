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

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection.Dispose();
    }
}
