using Microsoft.EntityFrameworkCore;

namespace AuthService.Data;

public class AuthDb : DbContext
{
    public AuthDb(DbContextOptions<AuthDb> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<LoginAttempt> LoginAttempts => Set<LoginAttempt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasKey(u => u.Username);
        modelBuilder.Entity<Session>().HasKey(s => s.Sid);
        modelBuilder.Entity<LoginAttempt>().HasKey(a => a.Username);
    }
}
