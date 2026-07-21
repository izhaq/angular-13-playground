using System.Net;
using System.Net.Http.Json;
using AuthService.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// Contract round-trip tests for POST /api/auth/logout — the executable form
/// of the spec's "API Contract" section: always 204 No Content (idempotent —
/// no cookie, unknown sid, and already-deleted all look the same, nothing to
/// reveal), the session row is really gone, and the sid cookie is cleared
/// with the same attributes it was set with.
/// </summary>
public class LogoutEndpointTests : IClassFixture<AuthServiceFactory>
{
    private readonly AuthServiceFactory _factory;

    public LogoutEndpointTests(AuthServiceFactory factory)
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
        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("sid="));
        return cookie.Split(';')[0]["sid=".Length..];
    }

    private static Task<HttpResponseMessage> Logout(HttpClient client, string? sid = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        if (sid is not null)
        {
            request.Headers.Add("Cookie", $"sid={sid}");
        }
        return client.SendAsync(request);
    }

    [Fact]
    public async Task Logout_with_a_live_sid_returns_204_and_deletes_the_session()
    {
        var client = CreateClient();
        var sid = await Login(client);

        var response = await Logout(client, sid);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());

        // The row is really gone…
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AuthDb>();
            Assert.False(db.Sessions.Any(s => s.Sid == sid));
        }

        // …so the old sid is instantly worthless.
        var sessionRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/session");
        sessionRequest.Headers.Add("Cookie", $"sid={sid}");
        var sessionResponse = await client.SendAsync(sessionRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, sessionResponse.StatusCode);
    }

    [Fact]
    public async Task Logout_clears_the_sid_cookie_with_matching_attributes()
    {
        var client = CreateClient();
        var sid = await Login(client);

        var response = await Logout(client, sid);

        AssertClearsSidCookie(response);
    }

    /// <summary>
    /// Asserts the response carries the clearing Set-Cookie: a browser only
    /// drops a cookie when it matches the attributes the cookie was set with
    /// (HttpOnly, SameSite=Lax, Path=/) and carries an expiry in the past.
    /// Every logout path must emit it identically — nothing to reveal.
    /// </summary>
    private static void AssertClearsSidCookie(HttpResponseMessage response)
    {
        Assert.True(response.Headers.TryGetValues("Set-Cookie", out var setCookies));
        var cookie = Assert.Single(setCookies!, c => c.StartsWith("sid="));
        var lower = cookie.ToLowerInvariant();
        Assert.StartsWith("sid=;", lower);
        Assert.Contains("expires=", lower);
        var expires = DateTimeOffset.Parse(
            lower.Split(';').Select(p => p.Trim()).Single(p => p.StartsWith("expires="))["expires=".Length..]);
        Assert.True(expires < DateTimeOffset.UtcNow);
        Assert.Contains("httponly", lower);
        Assert.Contains("samesite=lax", lower);
        Assert.Contains("path=/", lower);
    }

    [Fact]
    public async Task Logout_with_no_cookie_returns_204()
    {
        var client = CreateClient();

        var response = await Logout(client);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());

        // The clearing Set-Cookie is emitted even with no cookie on the
        // request — all logout paths look identical (anti-leak).
        AssertClearsSidCookie(response);
    }

    [Fact]
    public async Task Logout_with_an_unknown_sid_returns_204()
    {
        var client = CreateClient();

        var response = await Logout(client, "not-a-real-session-id");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // The clearing Set-Cookie is emitted for an unknown sid too — all
        // logout paths look identical (anti-leak).
        AssertClearsSidCookie(response);
    }

    [Fact]
    public async Task Logout_twice_with_the_same_sid_returns_204_both_times()
    {
        var client = CreateClient();
        var sid = await Login(client);

        var first = await Logout(client, sid);
        var second = await Logout(client, sid);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
    }
}
