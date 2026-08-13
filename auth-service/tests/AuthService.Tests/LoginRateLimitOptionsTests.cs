using AuthService.Http;
using Microsoft.Extensions.Configuration;

namespace AuthService.Tests;

/// <summary>
/// R1.6b — the login rate limiter is read from configuration once, into a
/// typed object, in the same style R1.5a established for the lockout policy
/// (<see cref="LockoutOptionsTests"/>) and for the same two reasons:
/// - <b>off unless configured.</b> No <c>LoginRateLimit:PermitLimit</c> means
///   no limiter at all — no partitions, no 429, nothing in the pipeline. The
///   station's own operators are the normal traffic here; a limiter nobody
///   asked for would be a way to lock them out that the config file does not
///   mention.
/// - <b>an invalid value stops the service</b>, naming the key. "0 requests
///   per minute" has no honest reading, and a limiter that quietly means
///   something other than what the file says is worse than none.
/// </summary>
public class LoginRateLimitOptionsTests
{
    private static LoginRateLimitOptions Parse(params (string Key, string? Value)[] settings) =>
        LoginRateLimitOptions.FromConfiguration(new ConfigurationBuilder()
            .AddInMemoryCollection(settings.ToDictionary(s => s.Key, s => s.Value))
            .Build());

    private static Exception ParseError(params (string Key, string? Value)[] settings) =>
        Assert.ThrowsAny<Exception>(() => Parse(settings));

    [Fact]
    public void An_absent_section_turns_the_limiter_off()
    {
        Assert.False(Parse().IsOn);
    }

    [Fact]
    public void An_explicitly_null_permit_limit_turns_the_limiter_off()
    {
        // How appsettings.json says "off" without deleting the documented key.
        Assert.False(Parse((LoginRateLimitOptions.PermitLimitKey, null)).IsOn);
    }

    [Fact]
    public void A_permit_limit_turns_the_limiter_on_with_the_default_window()
    {
        var options = Parse((LoginRateLimitOptions.PermitLimitKey, "10"));

        Assert.True(options.IsOn);
        Assert.Equal(10, options.PermitLimit);
        Assert.Equal(TimeSpan.FromMinutes(1), options.Window);
    }

    [Fact]
    public void The_window_comes_from_configuration_when_it_is_set()
    {
        var options = Parse(
            (LoginRateLimitOptions.PermitLimitKey, "10"),
            (LoginRateLimitOptions.WindowSecondsKey, "5"));

        Assert.Equal(TimeSpan.FromSeconds(5), options.Window);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    public void A_permit_limit_of_zero_or_less_is_refused_by_name(string permitLimit)
    {
        var error = ParseError((LoginRateLimitOptions.PermitLimitKey, permitLimit));

        Assert.Contains(LoginRateLimitOptions.PermitLimitKey, error.ToString());
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-30")]
    public void A_window_of_zero_or_less_is_refused_by_name(string windowSeconds)
    {
        var error = ParseError(
            (LoginRateLimitOptions.PermitLimitKey, "10"),
            (LoginRateLimitOptions.WindowSecondsKey, windowSeconds));

        Assert.Contains(LoginRateLimitOptions.WindowSecondsKey, error.ToString());
    }

    [Fact]
    public void A_window_without_a_permit_limit_is_not_even_looked_at()
    {
        // Refusing to start over a knob nobody reads would be noise — the same
        // call LockoutOptions makes about LockoutMinutes.
        Assert.False(Parse((LoginRateLimitOptions.WindowSecondsKey, "0")).IsOn);
    }
}
