namespace AuthService.Http;

/// <summary>
/// The per-IP rate limit on login (spec "Platform Modernization", R1.6), read
/// from configuration ONCE at startup — same shape and same two decisions as
/// <see cref="Sessions.LockoutOptions"/>:
///
/// - <b>Off unless configured.</b> No <c>LoginRateLimit:PermitLimit</c> means
///   no limiter at all: no partitions are tracked and 429 is unreachable. The
///   normal traffic here is two operators on a closed network, so a limiter
///   switched on by default would be a way to lock them out that nothing in
///   the config file mentions.
/// - <b>An invalid value stops the service</b>, naming the key. "0 requests
///   per window" has no honest reading, and a limiter that quietly means
///   something other than what the file says is worse than no limiter.
///
/// It complements the per-username lockout without touching its rules: the
/// lockout answers "this account has been guessed at too often", this answers
/// "this caller is talking too fast". Note what neither removes — a patient
/// attacker staying under both still gets their guesses (spec, "Known
/// accepted risk").
/// </summary>
public sealed class LoginRateLimitOptions
{
    /// <summary>Configuration keys, named here so the error messages cannot drift from them.</summary>
    public const string SectionKey = "LoginRateLimit";

    public const string PermitLimitKey = $"{SectionKey}:PermitLimit";
    public const string WindowSecondsKey = $"{SectionKey}:WindowSeconds";

    /// <summary>The rate-limiting policy attached to the login endpoint — and to nothing else.</summary>
    public const string PolicyName = "login-per-ip";

    /// <summary>Used when the limit is set but the window is not.</summary>
    private const double DefaultWindowSeconds = 60;

    /// <summary>No limiter: nothing registered, nothing partitioned, 429 unreachable.</summary>
    public static LoginRateLimitOptions Off { get; } = new(null, TimeSpan.Zero);

    private LoginRateLimitOptions(int? permitLimit, TimeSpan window)
    {
        PermitLimit = permitLimit;
        Window = window;
    }

    /// <summary>Requests allowed per window per caller, or null when the limiter is off.</summary>
    public int? PermitLimit { get; }

    /// <summary>How long a window lasts. Meaningless — and never read — while the limiter is off.</summary>
    public TimeSpan Window { get; }

    public bool IsOn => PermitLimit is not null;

    public static LoginRateLimitOptions On(int permitLimit, TimeSpan window)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(permitLimit);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(window.Ticks, nameof(window));
        return new LoginRateLimitOptions(permitLimit, window);
    }

    /// <summary>
    /// Reads the limit from <c>appsettings.json</c> / environment / command
    /// line. Throws <see cref="InvalidOperationException"/> naming the
    /// offending key when the configuration cannot be honoured as written.
    /// </summary>
    public static LoginRateLimitOptions FromConfiguration(IConfiguration configuration)
    {
        var permitLimit = configuration.GetValue<int?>(PermitLimitKey);
        if (permitLimit is null)
        {
            // Absent or null: off. The window is not even looked at — refusing
            // to start over a knob nobody reads would be noise.
            return Off;
        }

        if (permitLimit <= 0)
        {
            throw new InvalidOperationException(
                $"'{PermitLimitKey}' is {permitLimit}, which is not a number of requests. " +
                $"Set it to 1 or more to limit how fast one caller may attempt logins, or remove it " +
                $"(or set it to null) to turn the rate limit off entirely.");
        }

        var windowSeconds = configuration.GetValue<double?>(WindowSecondsKey) ?? DefaultWindowSeconds;
        if (windowSeconds <= 0)
        {
            throw new InvalidOperationException(
                $"'{WindowSecondsKey}' is {windowSeconds}, which is not a length of time. " +
                $"Set it above 0 while '{PermitLimitKey}' is set, or remove '{PermitLimitKey}' " +
                $"to turn the rate limit off entirely.");
        }

        return On(permitLimit.Value, TimeSpan.FromSeconds(windowSeconds));
    }
}
