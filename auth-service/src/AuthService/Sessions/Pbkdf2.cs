using System.Security.Cryptography;

namespace AuthService.Sessions;

/// <summary>
/// PBKDF2 password hashing via the built-in <see cref="Rfc2898DeriveBytes"/> —
/// no external dependency. Stored format (all pieces in one column):
/// <c>pbkdf2-sha256$&lt;iterations&gt;$&lt;salt base64&gt;$&lt;hash base64&gt;</c>.
/// </summary>
public static class Pbkdf2
{
    private const string Prefix = "pbkdf2-sha256";
    private const int Iterations = 100_000;
    private const int SaltSize = 16;  // bytes
    private const int HashSize = 32;  // bytes

    /// <summary>
    /// Verified against when the username is unknown, so the unknown-user and
    /// wrong-password paths cost the same (no username probing via timing).
    /// </summary>
    public static readonly string DummyHash = Hash(Guid.NewGuid().ToString());

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Derive(password, salt, Iterations);
        return $"{Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        var parts = stored.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix || !int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[2]);
        var expected = Convert.FromBase64String(parts[3]);
        var actual = Derive(password, salt, iterations);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    private static byte[] Derive(string password, byte[] salt, int iterations) =>
        Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, HashSize);
}
