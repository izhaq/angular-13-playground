using AuthService.Sessions;
using Microsoft.Extensions.Configuration;

namespace AuthService.Tests;

/// <summary>
/// R1.5a — the lockout policy is read from configuration ONCE, into a typed
/// object, and every reading of it is decided here rather than per request.
///
/// Two rules the spec is explicit about ("Lockout policy", R1.5 paragraphs):
/// - absent or null <c>MaxLoginAttempts</c> means the mechanism is entirely
///   off — not "off-ish", not "defaulted back to 5";
/// - an invalid value is never silently reinterpreted. It is rejected with a
///   message naming the offending key, because a lockout that quietly behaves
///   differently than its config reads is worse than no lockout at all.
/// </summary>
public class LockoutOptionsTests
{
    private static LockoutOptions Parse(params (string Key, string? Value)[] settings) =>
        LockoutOptions.FromConfiguration(new ConfigurationBuilder()
            .AddInMemoryCollection(settings.ToDictionary(s => s.Key, s => s.Value))
            .Build());

    private static Exception ParseError(params (string Key, string? Value)[] settings) =>
        Assert.ThrowsAny<Exception>(() => Parse(settings));

    [Fact]
    public void An_absent_MaxLoginAttempts_turns_the_mechanism_off()
    {
        var options = Parse();

        Assert.False(options.IsOn);
    }

    [Fact]
    public void An_explicitly_null_MaxLoginAttempts_turns_the_mechanism_off()
    {
        // How appsettings.json says "off" without deleting the documented key.
        var options = Parse(("MaxLoginAttempts", null));

        Assert.False(options.IsOn);
    }

    [Fact]
    public void A_number_turns_the_mechanism_on()
    {
        var options = Parse(("MaxLoginAttempts", "5"));

        Assert.True(options.IsOn);
        Assert.Equal(5, options.MaxAttempts);
    }

    [Fact]
    public void The_window_defaults_to_fifteen_minutes_when_only_the_limit_is_set()
    {
        var options = Parse(("MaxLoginAttempts", "5"));

        Assert.Equal(TimeSpan.FromMinutes(15), options.Window);
    }

    [Fact]
    public void The_window_comes_from_LockoutMinutes_when_it_is_set()
    {
        var options = Parse(("MaxLoginAttempts", "5"), ("LockoutMinutes", "30"));

        Assert.Equal(TimeSpan.FromMinutes(30), options.Window);
    }

    [Fact]
    public void A_MaxLoginAttempts_of_zero_is_rejected_by_name()
    {
        // Zero is the tempting silent reinterpretation: "lock immediately" or
        // "off"? Neither — say so and stop.
        var error = ParseError(("MaxLoginAttempts", "0"));

        Assert.Contains("MaxLoginAttempts", error.Message);
    }

    [Fact]
    public void A_negative_MaxLoginAttempts_is_rejected_by_name()
    {
        var error = ParseError(("MaxLoginAttempts", "-3"));

        Assert.Contains("MaxLoginAttempts", error.Message);
    }

    [Fact]
    public void A_MaxLoginAttempts_that_is_not_a_number_is_rejected_by_name()
    {
        var error = ParseError(("MaxLoginAttempts", "five"));

        Assert.Contains("MaxLoginAttempts", error.Message);
    }

    [Fact]
    public void A_LockoutMinutes_of_zero_is_rejected_by_name_while_lockout_is_on()
    {
        // A zero-length window is a lock that is over before it is written —
        // the config reads "locked for a while" and behaves as "never locked".
        var error = ParseError(("MaxLoginAttempts", "5"), ("LockoutMinutes", "0"));

        Assert.Contains("LockoutMinutes", error.Message);
    }

    [Fact]
    public void A_negative_LockoutMinutes_is_rejected_by_name_while_lockout_is_on()
    {
        var error = ParseError(("MaxLoginAttempts", "5"), ("LockoutMinutes", "-1"));

        Assert.Contains("LockoutMinutes", error.Message);
    }

    [Fact]
    public void LockoutMinutes_is_not_validated_while_the_mechanism_is_off()
    {
        // With no limit there is no lock, so the window is a knob nobody reads.
        // Failing on it would refuse to start over a setting that does nothing.
        var options = Parse(("LockoutMinutes", "0"));

        Assert.False(options.IsOn);
    }
}
