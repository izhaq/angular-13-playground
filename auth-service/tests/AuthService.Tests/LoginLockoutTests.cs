using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using AuthService.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// R1.4 — the login retry limit, i.e. the contract's reserved 423 becoming
/// real (spec "Lockout policy"): after MaxLoginAttempts consecutive failures
/// for a submitted username, login answers 423 {"error":"locked"} for
/// LockoutMinutes, then unlocks itself. A success resets the counter.
///
/// Two properties are load-bearing and each has its own test below:
/// - Attempts are counted for ANY submitted username, real or not, so
///   423-vs-401 cannot be used to discover which usernames exist.
/// - The counter lives in the database, not in host memory, so it is not
///   something a restart of the service would hand back as fresh tries.
///
/// Unlike the other suites this class builds its own factory per test (xUnit
/// makes a new instance per test) instead of sharing one: lockout state is
/// per-username and sticky by design, so a shared database would let one
/// test's lock decide another test's result.
/// </summary>
public class LoginLockoutTests : IDisposable
{
    private const string GoodPassword = "operation123!";
    private const string BadPassword = "wrong-password";
    private const int DefaultMaxAttempts = 5;

    /// <summary>appsettings.json's LockoutMinutes — how long a lock holds.</summary>
    private static readonly TimeSpan DefaultWindow = TimeSpan.FromMinutes(15);

    private readonly AuthServiceFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static Task<HttpResponseMessage> Attempt(HttpClient client, string username, string password) =>
        client.PostAsJsonAsync("/api/auth/login",
            new { username, password, mode = "operation", position = "active" });

    /// <summary>Fails enough times to trip the lock, asserting the shape of every step.</summary>
    private static async Task LockOut(HttpClient client, string username, int maxAttempts = DefaultMaxAttempts)
    {
        for (var attempt = 1; attempt < maxAttempts; attempt++)
        {
            var response = await Attempt(client, username, BadPassword);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        var last = await Attempt(client, username, BadPassword);
        Assert.Equal(HttpStatusCode.Locked, last.StatusCode);
    }

    private static async Task AssertLockedBody(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Locked, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("locked", body.RootElement.GetProperty("error").GetString());
    }

    private T WithDb<T>(Func<AuthDb, T> read)
    {
        using var scope = _factory.Services.CreateScope();
        return read(scope.ServiceProvider.GetRequiredService<AuthDb>());
    }

    [Fact]
    public async Task Five_consecutive_failures_lock_the_username_with_the_contract_body()
    {
        var client = _factory.CreateClient();

        for (var attempt = 1; attempt < DefaultMaxAttempts; attempt++)
        {
            var response = await Attempt(client, "operation", BadPassword);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // The attempt that reaches the limit is itself refused as locked —
        // the user learns why on the try that caused it, not on the next one.
        await AssertLockedBody(await Attempt(client, "operation", BadPassword));
    }

    [Fact]
    public async Task A_locked_username_is_refused_even_with_the_correct_password()
    {
        // The whole point of a retry limit: knowing the password is no longer
        // enough while the window is open.
        var client = _factory.CreateClient();
        await LockOut(client, "operation");

        await AssertLockedBody(await Attempt(client, "operation", GoodPassword));
    }

    [Fact]
    public async Task A_successful_login_resets_the_counter()
    {
        var client = _factory.CreateClient();
        for (var attempt = 1; attempt < DefaultMaxAttempts; attempt++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await Attempt(client, "operation", BadPassword)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.OK, (await Attempt(client, "operation", GoodPassword)).StatusCode);

        // Counting starts from scratch: the next failure is #1, not #5, so a
        // full fresh run of failures is needed to lock again.
        await LockOut(client, "operation");
    }

    [Fact]
    public async Task The_lock_expires_by_itself_and_the_counter_starts_again()
    {
        // The window passes because the CLOCK moves (R1.6a). Before, this test
        // reached into the LoginAttempts table and back-dated LockedUntil —
        // which proved the row could be edited, not that the service honours
        // the window it wrote.
        var clock = new TestTimeProvider();
        using var host = _factory.WithClock(clock);
        var client = host.CreateClient();
        await LockOut(client, "operation");

        clock.Advance(DefaultWindow + TimeSpan.FromMinutes(1));

        Assert.Equal(HttpStatusCode.OK, (await Attempt(client, "operation", GoodPassword)).StatusCode);

        // Unlocking forgets the old failures too, otherwise a single slip
        // after the window would snap the lock straight back shut.
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await Attempt(client, "operation", BadPassword)).StatusCode);
    }

    [Fact]
    public async Task An_unknown_username_locks_exactly_like_a_real_one()
    {
        // If only real usernames could lock, 423-vs-401 would answer "does
        // this account exist?" — the one thing the login endpoint must never
        // tell an anonymous caller.
        var client = _factory.CreateClient();

        await LockOut(client, "nobody-at-all");

        await AssertLockedBody(await Attempt(client, "nobody-at-all", BadPassword));
    }

    [Fact]
    public async Task Locking_one_username_leaves_the_other_alone()
    {
        var client = _factory.CreateClient();
        await LockOut(client, "operation");

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { username = "technician", password = "technician123!", mode = "technician", position = "passive" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Attempts_made_while_locked_do_not_extend_the_window()
    {
        // Otherwise a bot hammering the endpoint would keep the real operator
        // locked out forever.
        var client = _factory.CreateClient();
        await LockOut(client, "operation");
        var lockedUntil = WithDb(db => db.LoginAttempts.Single(a => a.Username == "operation").LockedUntil);

        for (var i = 0; i < 3; i++)
        {
            await AssertLockedBody(await Attempt(client, "operation", BadPassword));
        }

        Assert.Equal(lockedUntil, WithDb(db => db.LoginAttempts.Single(a => a.Username == "operation").LockedUntil));
    }

    [Fact]
    public async Task Both_knobs_come_from_configuration()
    {
        using var factory = _factory.WithWebHostBuilder(builder => builder
            .UseSetting("MaxLoginAttempts", "2")
            .UseSetting("LockoutMinutes", "30"));
        var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await Attempt(client, "operation", BadPassword)).StatusCode);
        await AssertLockedBody(await Attempt(client, "operation", BadPassword));

        var lockedUntil = WithDb(db => db.LoginAttempts.Single(a => a.Username == "operation").LockedUntil);
        Assert.NotNull(lockedUntil);
        Assert.InRange(lockedUntil!.Value,
            DateTimeOffset.UtcNow.AddMinutes(29), DateTimeOffset.UtcNow.AddMinutes(31));
    }

    [Fact]
    public async Task The_lock_is_not_host_state_so_a_second_host_sees_it()
    {
        await LockOut(_factory.CreateClient(), "operation");

        // Two hosts share one in-memory database here, so what this proves is
        // that the counter lives in the DATABASE and not in host memory — an
        // in-memory counter would hand the attacker a fresh five tries. It is
        // not a real process restart (the database would have to be the file
        // on disk for that); the on-disk case follows from the same rows.
        using var secondHost = _factory.WithWebHostBuilder(_ => { });

        await AssertLockedBody(await Attempt(secondHost.CreateClient(), "operation", GoodPassword));
    }

    [Fact]
    public async Task A_malformed_request_is_not_a_failed_attempt()
    {
        // A 400 never reaches the password check, so counting it would let
        // anyone lock an operator out with pure garbage.
        var client = _factory.CreateClient();
        for (var attempt = 1; attempt < DefaultMaxAttempts; attempt++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await Attempt(client, "operation", BadPassword)).StatusCode);
        }

        var malformed = await client.PostAsync("/api/auth/login", new StringContent(
            @"{""username"":""operation"",""mode"":""operation"",""position"":""active""}",
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);

        // Still the 4 real failures, so the correct password still works.
        Assert.Equal(HttpStatusCode.OK, (await Attempt(client, "operation", GoodPassword)).StatusCode);
    }
}
