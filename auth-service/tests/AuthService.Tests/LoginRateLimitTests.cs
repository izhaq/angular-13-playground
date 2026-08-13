using System.Net;
using System.Net.Http.Json;
using AuthService.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AuthService.Tests;

/// <summary>
/// R1.6b — the per-IP rate limiter on login, through HTTP.
///
/// It complements the per-username lockout rather than replacing it: the
/// lockout answers "this account has been guessed at too often", the limiter
/// answers "this caller is talking too fast". Spec ("Platform Modernization"):
/// configurable, <b>off unless configured</b>, 429 when exceeded, and 429 is
/// deliberately NOT added to the client contract — the login page treats it
/// like any other unexpected status.
///
/// Off-by-default is the load-bearing half. The real deployment is two
/// operators on a closed network; a limiter switched on by accident would be
/// a way to lock them out that nothing in the config file mentions.
///
/// Each test builds its own factory: limiter state, like lockout state, is
/// sticky within a window, so a shared host would let one test's spending
/// decide another test's result.
/// </summary>
public class LoginRateLimitTests : IDisposable
{
    private const string GoodPassword = "operation123!";
    private const string BadPassword = "wrong-password";

    private readonly AuthServiceFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static Task<HttpResponseMessage> Attempt(HttpClient client, string password = BadPassword) =>
        client.PostAsJsonAsync("/api/auth/login",
            new { username = "operation", password, mode = "operation", position = "active" });

    /// <summary>A host with the limiter configured, and the lockout out of the way unless a test wants it.</summary>
    private WebApplicationFactory<Program> Limited(
        int permitLimit, string? maxLoginAttempts = null, int? windowSeconds = null) =>
        _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting(LoginRateLimitOptions.PermitLimitKey, permitLimit.ToString());
            builder.UseSetting("MaxLoginAttempts", maxLoginAttempts);
            if (windowSeconds is not null)
            {
                builder.UseSetting(LoginRateLimitOptions.WindowSecondsKey, windowSeconds.Value.ToString());
            }
        });

    [Fact]
    public async Task With_no_configuration_no_amount_of_speed_is_ever_429()
    {
        // The default appsettings.json ships the limiter off. Twenty logins as
        // fast as the host will take them and not one of them is refused for
        // being too fast.
        using var host = _factory.WithWebHostBuilder(builder =>
            builder.UseSetting("MaxLoginAttempts", null));
        var client = host.CreateClient();

        for (var i = 0; i < 20; i++)
        {
            var response = await Attempt(client);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }

    [Fact]
    public async Task Configured_low_the_attempt_past_the_limit_is_429()
    {
        using var host = Limited(permitLimit: 3);
        var client = host.CreateClient();

        for (var i = 0; i < 3; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await Attempt(client)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await Attempt(client)).StatusCode);
    }

    [Fact]
    public async Task A_correct_password_is_refused_too_once_the_limit_is_spent()
    {
        // The limiter is about the CALLER's rate, not about whether the
        // credentials were any good — it runs before the endpoint at all.
        using var host = Limited(permitLimit: 2);
        var client = host.CreateClient();

        await Attempt(client);
        await Attempt(client);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await Attempt(client, GoodPassword)).StatusCode);
    }

    [Fact]
    public async Task Only_login_is_limited()
    {
        // Applied to /api/auth/login ONLY. Session and logout are the calls a
        // page reload makes; limiting them would log the station out for
        // refreshing too eagerly, and they carry no guessable secret.
        using var host = Limited(permitLimit: 1);
        var client = host.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await Attempt(client)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Attempt(client)).StatusCode);

        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/session")).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
        }
    }

    [Fact]
    public async Task The_lockout_still_decides_what_a_slow_attacker_gets()
    {
        // "Complements the lockout without touching its own rules": with the
        // limit set far above the retry limit, the fifth wrong password is
        // still 423 locked, not 429.
        using var host = Limited(permitLimit: 100, maxLoginAttempts: "5");
        var client = host.CreateClient();

        for (var i = 0; i < 4; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await Attempt(client)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Locked, (await Attempt(client)).StatusCode);
    }

    [Fact]
    public async Task A_429_never_reaches_the_password_check_so_it_is_not_a_failed_attempt()
    {
        // A request the limiter refused was never a guess, so counting it
        // would hand anyone a way to lock an operator out with pure speed.
        using var host = Limited(permitLimit: 2, maxLoginAttempts: "5");
        var client = host.CreateClient();

        await Attempt(client);
        await Attempt(client);
        for (var i = 0; i < 10; i++)
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, (await Attempt(client)).StatusCode);
        }

        // Only the two real failures were counted, so the window is nowhere
        // near the limit of five and a correct password still works.
        using var relaxed = Limited(permitLimit: 100, maxLoginAttempts: "5");
        Assert.Equal(HttpStatusCode.OK, (await Attempt(relaxed.CreateClient(), GoodPassword)).StatusCode);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    public void An_invalid_permit_limit_stops_startup_and_names_the_key(string permitLimit)
    {
        var error = Start((LoginRateLimitOptions.PermitLimitKey, permitLimit));

        Assert.NotNull(error);
        Assert.Contains(LoginRateLimitOptions.PermitLimitKey, error!.ToString());
    }

    [Fact]
    public void An_invalid_window_stops_startup_and_names_the_key()
    {
        var error = Start(
            (LoginRateLimitOptions.PermitLimitKey, "5"),
            (LoginRateLimitOptions.WindowSecondsKey, "0"));

        Assert.NotNull(error);
        Assert.Contains(LoginRateLimitOptions.WindowSecondsKey, error!.ToString());
    }

    /// <summary>Boots the real Program with these settings; returns what startup threw, if anything.</summary>
    private Exception? Start(params (string Key, string? Value)[] settings)
    {
        using var host = _factory.WithWebHostBuilder(builder =>
        {
            foreach (var (key, value) in settings)
            {
                builder.UseSetting(key, value);
            }
        });

        return Record.Exception(() => host.CreateClient());
    }
}
