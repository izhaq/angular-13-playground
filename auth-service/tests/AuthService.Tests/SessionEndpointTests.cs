using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AuthService.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// Contract round-trip tests for GET /api/auth/session — the executable form
/// of the spec's "API Contract" section: valid live session → 200 with the
/// same body shape as login; no cookie / unknown sid / expired session → 401.
/// The 401 carries no body (the spec specifies none for /session).
/// </summary>
public class SessionEndpointTests : IClassFixture<AuthServiceFactory>
{
    private readonly AuthServiceFactory _factory;

    public SessionEndpointTests(AuthServiceFactory factory)
    {
        _factory = factory;
    }

    // Cookies are set manually per test (no automatic cookie jar) so each
    // test states exactly which sid travels — nothing hides in client state.
    private HttpClient CreateClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private static async Task<(string Sid, JsonDocument Body)> Login(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { username = "operation", password = "operation123!", mode = "operation", position = "active" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("sid="));
        var sid = cookie.Split(';')[0]["sid=".Length..];
        return (sid, JsonDocument.Parse(await response.Content.ReadAsStringAsync()));
    }

    [Fact]
    public async Task Session_with_a_valid_sid_returns_200_with_the_same_body_as_login()
    {
        var client = CreateClient();
        var (sid, loginBody) = await Login(client);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/session");
        request.Headers.Add("Cookie", $"sid={sid}");
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var user = body.RootElement.GetProperty("user");
        Assert.Equal("operation", user.GetProperty("username").GetString());
        Assert.Equal("operation", user.GetProperty("mode").GetString());
        Assert.Equal("active", user.GetProperty("position").GetString());
        Assert.Equal(
            loginBody.RootElement.GetProperty("expiresAt").GetString(),
            body.RootElement.GetProperty("expiresAt").GetString());
        loginBody.Dispose();
    }

    [Fact]
    public async Task Session_with_no_cookie_returns_401_with_no_body()
    {
        var client = CreateClient();

        var response = await client.GetAsync("/api/auth/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Session_with_an_unknown_sid_returns_401()
    {
        var client = CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/session");
        request.Headers.Add("Cookie", "sid=not-a-real-session-id");
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Session_with_an_expired_sid_returns_401_like_an_unknown_one()
    {
        // Sessions are never purged, so an expired row still sits in the
        // table — the endpoint must gate on ExpiresAt, not just existence.
        const string sid = "expired-session-for-test";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AuthDb>();
            db.Sessions.Add(new Session
            {
                Sid = sid,
                Username = "operation",
                Mode = "operation",
                Position = "active",
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1),
            });
            db.SaveChanges();
        }

        var client = CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/session");
        request.Headers.Add("Cookie", $"sid={sid}");
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
    }
}
