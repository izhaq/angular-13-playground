using System.Net;
using System.Net.Http.Json;
using AuthService.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Tests;

/// <summary>
/// R1.5a through HTTP: with <c>MaxLoginAttempts</c> unset, login behaves
/// exactly as it did before the retry limit existed — every wrong password is
/// a plain 401, no matter how many there are, and the correct one still works.
///
/// <see cref="LoginLockoutTests"/> is the mirror image of this suite (lockout
/// ON, today's behavior). Together they pin both halves of the switch.
/// </summary>
public class LoginWithoutLockoutTests : IDisposable
{
    private const string GoodPassword = "operation123!";
    private const string BadPassword = "wrong-password";

    private readonly AuthServiceFactory _factory = new();
    private readonly WebApplicationFactory<Program> _lockoutOff;

    public LoginWithoutLockoutTests() =>
        _lockoutOff = _factory.WithWebHostBuilder(builder => builder.UseSetting("MaxLoginAttempts", null));

    public void Dispose()
    {
        _lockoutOff.Dispose();
        _factory.Dispose();
    }

    private static Task<HttpResponseMessage> Attempt(HttpClient client, string password) =>
        client.PostAsJsonAsync("/api/auth/login",
            new { username = "operation", password, mode = "operation", position = "active" });

    [Fact]
    public async Task Ten_wrong_passwords_are_all_plain_401s()
    {
        var client = _lockoutOff.CreateClient();

        for (var attempt = 1; attempt <= 10; attempt++)
        {
            var response = await Attempt(client, BadPassword);

            // Twice the default limit and still 401: 423 is unreachable, not
            // merely postponed.
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }

    [Fact]
    public async Task Nothing_is_written_to_the_LoginAttempts_table()
    {
        var client = _lockoutOff.CreateClient();
        for (var attempt = 1; attempt <= 10; attempt++)
        {
            await Attempt(client, BadPassword);
        }

        using var scope = _lockoutOff.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AuthDb>();

        // "Off" means nothing is counted, not that the count is ignored.
        Assert.Empty(db.LoginAttempts.ToList());
    }

    [Fact]
    public async Task The_correct_password_still_logs_in_after_many_failures()
    {
        var client = _lockoutOff.CreateClient();
        for (var attempt = 1; attempt <= 10; attempt++)
        {
            await Attempt(client, BadPassword);
        }

        Assert.Equal(HttpStatusCode.OK, (await Attempt(client, GoodPassword)).StatusCode);
    }
}
