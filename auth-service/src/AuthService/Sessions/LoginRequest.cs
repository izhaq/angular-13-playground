namespace AuthService.Sessions;

/// <summary>
/// Body of POST /api/auth/login (see spec "API Contract"). Fields are nullable
/// so a missing field binds instead of throwing — validation decides.
/// </summary>
public record LoginRequest(string? Username, string? Password, string? Mode, string? Position)
{
    private static readonly string[] Modes = { "operation", "technician" };
    private static readonly string[] Positions = { "active", "passive" };

    public bool IsValid() =>
        !string.IsNullOrWhiteSpace(Username) &&
        !string.IsNullOrWhiteSpace(Password) &&
        Modes.Contains(Mode) &&
        Positions.Contains(Position);
}
