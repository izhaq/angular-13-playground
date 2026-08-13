using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AuthService.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// R1.2 — "sessions never expire on their own; only explicit logout ends
/// them" (spec "Session rules"). The default configuration leaves
/// <c>SessionTtlHours</c> unset, which means NO expiry: the contract's
/// <c>expiresAt</c> is null, the session row carries no expiry, and the sid
/// cookie gets a long fixed Max-Age so a station reboot does not log the
/// station out.
///
/// The timed behavior is not gone, only demoted to an opt-in escape hatch —
/// <see cref="LoginEndpointTests"/> covers it under an explicit
/// <c>SessionTtlHours</c>, and <see cref="SessionEndpointTests"/> still
/// proves an already-expired row is refused.
/// </summary>
public class SessionExpiryTests : IClassFixture<AuthServiceFactory>
{
    /// <summary>~10 years, the cookie lifetime when expiry is off.</summary>
    private static readonly TimeSpan Foreverish = TimeSpan.FromDays(3650);

    private readonly AuthServiceFactory _factory;

    public SessionExpiryTests(AuthServiceFactory factory)
    {
        _factory = factory;
    }

    // Cookies are set manually per test (no automatic cookie jar) so each
    // test states exactly which sid travels — nothing hides in client state.
    private HttpClient CreateClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private static async Task<string> Login(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { username = "operation", password = "operation123!", mode = "operation", position = "active" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return ExtractSid(response);
    }

    private static string ExtractSid(HttpResponseMessage response) => SidCookies.Value(response);

    private static Task<HttpResponseMessage> GetSession(HttpClient client, string sid)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/session");
        request.Headers.Add("Cookie", $"sid={sid}");
        return client.SendAsync(request);
    }

    [Fact]
    public async Task Login_returns_a_null_expires_at_when_no_ttl_is_configured()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { username = "operation", password = "operation123!", mode = "operation", position = "active" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        // Present but null — the contract keeps the field, the value says
        // "this session has no end".
        Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("expiresAt").ValueKind);
    }

    [Fact]
    public async Task Login_stores_a_session_row_with_no_expiry_when_no_ttl_is_configured()
    {
        var client = CreateClient();

        var sid = await Login(client);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AuthDb>();
        Assert.Null(db.Sessions.Single(s => s.Sid == sid).ExpiresAt);
    }

    [Fact]
    public async Task Login_cookie_max_age_is_about_ten_years_when_no_ttl_is_configured()
    {
        // The station must stay logged in across a browser restart, so the
        // cookie cannot be a session cookie and cannot carry a short Max-Age.
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { username = "operation", password = "operation123!", mode = "operation", position = "active" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.InRange(SidCookies.MaxAgeSeconds(response),
            (long)Foreverish.TotalSeconds - 1, (long)Foreverish.TotalSeconds + 1);
    }

    [Fact]
    public async Task Session_returns_a_null_expires_at_when_no_ttl_is_configured()
    {
        var client = CreateClient();
        var sid = await Login(client);

        var response = await GetSession(client, sid);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("expiresAt").ValueKind);
    }

    [Fact]
    public async Task A_real_session_with_no_expiry_is_live_whatever_the_clock_says()
    {
        // A session created by LOGGING IN, then a century of clock (R1.6a).
        // This used to write the row by hand, which could only ever prove the
        // lookup rule about a null ExpiresAt; driving the clock proves the
        // thing the requirement is actually about — that time cannot end a
        // session the operator never logged out of.
        var clock = new TestTimeProvider();
        using var host = _factory.WithClock(clock);
        var client = host.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var sid = await Login(client);

        clock.Advance(TimeSpan.FromDays(365 * 100));

        var response = await GetSession(client, sid);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("operation", body.RootElement.GetProperty("user").GetProperty("username").GetString());
    }

    [Fact]
    public async Task Logout_still_ends_a_never_expiring_session()
    {
        // The whole point of R1.2: time no longer ends a session, so logout
        // is the ONLY thing that does. It must keep working.
        var client = CreateClient();
        var sid = await Login(client);

        var logout = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        logout.Headers.Add("Cookie", $"sid={sid}");
        var logoutResponse = await client.SendAsync(logout);

        Assert.Equal(HttpStatusCode.NoContent, logoutResponse.StatusCode);
        var sessionResponse = await GetSession(client, sid);
        Assert.Equal(HttpStatusCode.Unauthorized, sessionResponse.StatusCode);
    }
}
