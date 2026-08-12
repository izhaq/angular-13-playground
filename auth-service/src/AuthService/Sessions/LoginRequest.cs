namespace AuthService.Sessions;

/// <summary>
/// Body of POST /api/auth/login (see spec "API Contract"). Fields are nullable
/// so a missing field binds instead of throwing — validation decides.
/// </summary>
public record LoginRequest(string? Username, string? Password, string? Mode, string? Position)
{
    /// <summary>
    /// Upper bounds on the free-text fields — far above anything legitimate,
    /// but a bound where none existed. Without them one request can carry
    /// megabytes into the password check (600k PBKDF2 iterations over the
    /// whole string — CPU an attacker spends nothing to demand) and every
    /// submitted username becomes a LoginAttempts row, so unbounded usernames
    /// are unbounded disk. An overlong field is malformed input, so it takes
    /// the same 400 as every other shape of malformed — and, like any other
    /// invalid request, is never counted as a failed attempt.
    /// </summary>
    public const int MaxUsernameLength = 64;
    public const int MaxPasswordLength = 128;

    private static readonly string[] Modes = { "operation", "technician" };
    private static readonly string[] Positions = { "active", "passive" };

    public bool IsValid() =>
        !string.IsNullOrWhiteSpace(Username) && Username.Length <= MaxUsernameLength &&
        !string.IsNullOrWhiteSpace(Password) && Password.Length <= MaxPasswordLength &&
        Modes.Contains(Mode) &&
        Positions.Contains(Position);
}
