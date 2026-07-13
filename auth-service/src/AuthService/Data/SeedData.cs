using AuthService.Sessions;

namespace AuthService.Data;

/// <summary>
/// Seeds the two station users. The passwords are OBVIOUSLY FAKE dev-only
/// values (documented in the spec) — never reuse this seed outside dev.
/// </summary>
public static class SeedData
{
    public static void EnsureSeeded(AuthDb db)
    {
        if (db.Users.Any())
        {
            return;
        }

        db.Users.AddRange(
            new User { Username = "operation", PasswordHash = Pbkdf2.Hash("operation123!") },
            new User { Username = "technician", PasswordHash = Pbkdf2.Hash("technician123!") });
        db.SaveChanges();
    }
}
