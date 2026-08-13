namespace AuthService.Sessions;

/// <summary>
/// The lockout policy (spec "Lockout policy", R1.4 extended by R1.5), read
/// from configuration ONCE at startup rather than per request.
///
/// Two decisions live here, and both are the spec's:
/// - <b>The mechanism is optional.</b> No <c>MaxLoginAttempts</c> means no
///   lockout at all — nothing counted, nothing stored, 423 never returned.
///   That is <see cref="Off"/>, and it is a first-class configuration, not a
///   degraded one.
/// - <b>An invalid value stops the service.</b> A limit of 0 or a window of 0
///   has no sane reading: "lock at once"? "off"? Guessing would leave the
///   operator with a config file that says one thing while the service does
///   another, which is worse than having no lockout. So parsing refuses, by
///   name, and <c>Program</c> does it before the host starts.
/// </summary>
public sealed class LockoutOptions
{
    /// <summary>Configuration keys, named here so the error messages cannot drift from them.</summary>
    public const string MaxAttemptsKey = "MaxLoginAttempts";
    public const string WindowMinutesKey = "LockoutMinutes";

    /// <summary>Used when the limit is set but the window is not (R1.4's documented default).</summary>
    private const double DefaultWindowMinutes = 15;

    /// <summary>Lockout turned off: the state <see cref="LockoutService"/> answers "not locked, nothing counted" in.</summary>
    public static LockoutOptions Off { get; } = new(null, TimeSpan.Zero);

    private LockoutOptions(int? maxAttempts, TimeSpan window)
    {
        MaxAttempts = maxAttempts;
        Window = window;
    }

    /// <summary>Consecutive failures that trip the lock, or null when lockout is off.</summary>
    public int? MaxAttempts { get; }

    /// <summary>How long the lock holds. Meaningless — and never read — while lockout is off.</summary>
    public TimeSpan Window { get; }

    public bool IsOn => MaxAttempts is not null;

    public static LockoutOptions On(int maxAttempts, TimeSpan window)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(maxAttempts);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(window.Ticks, nameof(window));
        return new LockoutOptions(maxAttempts, window);
    }

    /// <summary>
    /// Reads the policy from <c>appsettings.json</c> / environment / command
    /// line. Throws <see cref="InvalidOperationException"/> naming the
    /// offending key when the configuration cannot be honoured as written.
    /// </summary>
    public static LockoutOptions FromConfiguration(IConfiguration configuration)
    {
        // A non-numeric value throws from the binder with the key already in
        // the message ("Failed to convert configuration value at
        // 'MaxLoginAttempts'..."), which is exactly the report we want.
        var maxAttempts = configuration.GetValue<int?>(MaxAttemptsKey);
        if (maxAttempts is null)
        {
            // Absent or null: off. The window is not even looked at — refusing
            // to start over a knob nobody reads would be noise.
            return Off;
        }

        if (maxAttempts <= 0)
        {
            throw new InvalidOperationException(
                $"'{MaxAttemptsKey}' is {maxAttempts}, which is not a number of attempts. " +
                $"Set it to 1 or more to limit login retries, or remove it (or set it to null) " +
                $"to turn the lockout off entirely.");
        }

        var windowMinutes = configuration.GetValue<double?>(WindowMinutesKey) ?? DefaultWindowMinutes;
        if (windowMinutes <= 0)
        {
            throw new InvalidOperationException(
                $"'{WindowMinutesKey}' is {windowMinutes}, which is not a length of time. " +
                $"Set it above 0 while '{MaxAttemptsKey}' is set, or remove '{MaxAttemptsKey}' " +
                $"to turn the lockout off entirely.");
        }

        return On(maxAttempts.Value, TimeSpan.FromMinutes(windowMinutes));
    }
}
