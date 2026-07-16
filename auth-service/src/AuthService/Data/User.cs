namespace AuthService.Data;

/// <summary>A seeded station user. Username is the primary key.</summary>
public class User
{
    public string Username { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
}
