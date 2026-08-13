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

        // Makes a lost update loud: EF puts Version in the UPDATE's WHERE, so
        // an increment computed from a value another request has already
        // replaced affects zero rows and throws instead of overwriting.
        modelBuilder.Entity<LoginAttempt>().Property(a => a.Version).IsConcurrencyToken();
    }
}
