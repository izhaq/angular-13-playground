namespace AuthService.Data;

/// <summary>
/// A live login. The Sid is the opaque value inside the browser's cookie —
/// meaningless by itself, it is only a key into this table.
/// </summary>
public class Session
{
    public string Sid { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Mode { get; set; } = null!;
    public string Position { get; set; } = null!;

    /// <summary>
    /// When the session stops being valid, or <c>null</c> for "never" — the
    /// default since R1.2, where only an explicit logout ends a session.
    /// </summary>
    public DateTimeOffset? ExpiresAt { get; set; }
}
