using Microsoft.AspNetCore.Hosting;

namespace AuthService.Tests;

/// <summary>
/// R1.5a — invalid lockout configuration stops the service at STARTUP, in one
/// place, naming the key that is wrong.
///
/// The alternative is worse than it looks: a service that boots with a
/// nonsensical limit either locks nobody or locks everybody, and the operator
/// reads a config file that says something different from what the service
/// does. Same reasoning as <see cref="StaleSchemaStartupTests"/> — fail loudly
/// once instead of quietly forever.
/// </summary>
public class LockoutStartupValidationTests : IDisposable
{
    private readonly AuthServiceFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    /// <summary>Boots the real Program with these settings; returns what startup threw, if anything.</summary>
    private Exception? Start(params (string Key, string? Value)[] settings)
    {
        using var factory = _factory.WithWebHostBuilder(builder =>
        {
            foreach (var (key, value) in settings)
            {
                builder.UseSetting(key, value);
            }
        });

        return Record.Exception(() => factory.CreateClient());
    }

    [Fact]
    public void A_MaxLoginAttempts_of_zero_stops_startup_and_names_the_key()
    {
        var error = Start(("MaxLoginAttempts", "0"));

        Assert.NotNull(error);
        Assert.Contains("MaxLoginAttempts", error!.ToString());
    }

    [Fact]
    public void A_LockoutMinutes_of_zero_stops_startup_and_names_the_key()
    {
        var error = Start(("MaxLoginAttempts", "5"), ("LockoutMinutes", "0"));

        Assert.NotNull(error);
        Assert.Contains("LockoutMinutes", error!.ToString());
    }

    [Fact]
    public void Lockout_turned_off_starts_normally()
    {
        // The off switch is a supported configuration, not a degraded one.
        Assert.Null(Start(("MaxLoginAttempts", null)));
    }
}
