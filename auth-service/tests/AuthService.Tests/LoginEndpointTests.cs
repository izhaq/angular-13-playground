using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AuthService.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// Contract round-trip tests for POST /api/auth/login — the executable form
/// of the spec's "API Contract" section. Bodies are parsed as JSON and
/// asserted field by field (never exact-string compared).
/// </summary>
public class LoginEndpointTests : IClassFixture<AuthServiceFactory>
{
    private readonly AuthServiceFactory _factory;

    public LoginEndpointTests(AuthServiceFactory factory)
    {
        _factory = factory;
    }

    private static object ValidLogin(string password = "operation123!") => new
    {
        username = "operation",
        password,
        mode = "operation",
        position = "active",
    };

    [Fact]
    public async Task Login_with_valid_credentials_returns_200_with_contract_body()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", ValidLogin());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var user = body.RootElement.GetProperty("user");
        Assert.Equal("operation", user.GetProperty("username").GetString());
        Assert.Equal("operation", user.GetProperty("mode").GetString());
        Assert.Equal("active", user.GetProperty("position").GetString());

        // expiresAt: null by default since R1.2 — sessions do not expire on
        // their own. SessionExpiryTests owns that story; the configured-TTL
        // shape is the test below.
        Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("expiresAt").ValueKind);
    }

    [Fact]
    public async Task Login_returns_an_iso_expires_at_when_a_ttl_is_configured()
    {
        // SessionTtlHours survives R1.2 as an opt-in escape hatch: set it and
        // the pre-R1.2 timed behavior comes back exactly as it was.
        using var factory = _factory.WithWebHostBuilder(builder =>
            builder.UseSetting("SessionTtlHours", "2"));
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", ValidLogin());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var expiresAt = DateTimeOffset.Parse(body.RootElement.GetProperty("expiresAt").GetString()!);
        Assert.True(expiresAt > DateTimeOffset.UtcNow.AddMinutes(110));
        Assert.True(expiresAt < DateTimeOffset.UtcNow.AddMinutes(130));

        // The cookie must not outlive the session it carries: a body promising
        // two hours next to a ten-year cookie would leave the browser holding a
        // sid the server stopped honouring long ago.
        Assert.Equal(2 * 3600, SidCookies.MaxAgeSeconds(response));
    }

    [Fact]
    public async Task Login_sets_an_httponly_lax_sid_cookie()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", ValidLogin());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Set-Cookie", out var setCookies));
        var cookie = Assert.Single(setCookies!, c => c.StartsWith("sid="));
        var lower = cookie.ToLowerInvariant();
        Assert.Contains("httponly", lower);
        Assert.Contains("samesite=lax", lower);
        Assert.Contains("path=/", lower);
        Assert.Contains("max-age=", lower);
        // Plain-HTTP dev: the Secure flag must NOT be set (it would kill the cookie).
        Assert.DoesNotContain("secure", lower);
    }

    [Fact]
    public async Task Login_creates_a_session_row_matching_the_cookie()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { username = "technician", password = "technician123!", mode = "technician", position = "passive" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var sid = ExtractSid(response);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AuthDb>();
        var session = db.Sessions.Single(s => s.Sid == sid);
        Assert.Equal("technician", session.Username);
        Assert.Equal("technician", session.Mode);
        Assert.Equal("passive", session.Position);
        // No expiry by default since R1.2.
        Assert.Null(session.ExpiresAt);
    }

    [Fact]
    public async Task Two_logins_produce_different_sids()
    {
        var client = _factory.CreateClient();

        var first = await client.PostAsJsonAsync("/api/auth/login", ValidLogin());
        var second = await client.PostAsJsonAsync("/api/auth/login", ValidLogin());

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.NotEqual(ExtractSid(first), ExtractSid(second));
    }

    [Fact]
    public async Task Cookie_max_age_value_equals_the_configured_ttl_in_seconds()
    {
        // A non-default TTL proves the value is driven by SessionTtlHours,
        // not a hardcoded 24h.
        using var factory = _factory.WithWebHostBuilder(builder =>
            builder.UseSetting("SessionTtlHours", "2"));
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", ValidLogin());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2 * 3600, SidCookies.MaxAgeSeconds(response));
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401_invalid_credentials()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", ValidLogin(password: "wrong-password"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("invalid_credentials", body.RootElement.GetProperty("error").GetString());
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Login_with_unknown_user_returns_the_same_401_as_wrong_password()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { username = "nobody", password = "operation123!", mode = "operation", position = "active" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("invalid_credentials", body.RootElement.GetProperty("error").GetString());
    }

    [Theory]
    [InlineData(/* missing password  */ @"{""username"":""operation"",""mode"":""operation"",""position"":""active""}")]
    [InlineData(/* missing username  */ @"{""password"":""operation123!"",""mode"":""operation"",""position"":""active""}")]
    [InlineData(/* empty username    */ @"{""username"":"""",""password"":""operation123!"",""mode"":""operation"",""position"":""active""}")]
    [InlineData(/* invalid mode      */ @"{""username"":""operation"",""password"":""operation123!"",""mode"":""commander"",""position"":""active""}")]
    [InlineData(/* invalid position  */ @"{""username"":""operation"",""password"":""operation123!"",""mode"":""operation"",""position"":""middle""}")]
    public async Task Login_with_missing_or_malformed_fields_returns_400_invalid_request(string json)
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/auth/login",
            new StringContent(json, System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("invalid_request", body.RootElement.GetProperty("error").GetString());
    }

    private static string ExtractSid(HttpResponseMessage response) => SidCookies.Value(response);
}
