using AuthService.Data;
using AuthService.Sessions;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Admin;

/// <summary>
/// <c>AuthService unlock &lt;username&gt;</c> (dev: <c>dotnet run -- unlock
/// operation</c>) — the primary manual release (spec "Manual unlock", R1.5).
///
/// Someone locked out cannot log in to free themselves, so the release must
/// not require a login. This one requires no network at all: it opens the same
/// SQLite file through the same EF seam and clears the same row the service
/// would, which means it works while the service is STOPPED — the state a
/// station is most likely to be in when someone is standing at it.
///
/// <see cref="Matches"/> is consulted by <c>Program</c> before any host is
/// built, for two reasons: the web host's command-line configuration provider
/// rejects bare arguments like <c>unlock operation</c>, and an operator
/// command has no business opening an HTTP listener.
/// </summary>
public static class UnlockCommand
{
    public const string Name = "unlock";

    private const string Usage = $"usage: AuthService {Name} <username>";

    private const int Success = 0;
    private const int UsageError = 1;

    /// <summary>Whether this argv is the unlock command rather than a service start.</summary>
    public static bool Matches(string[] args) => args.Length > 0 && args[0] == Name;

    /// <summary>
    /// The command as <c>Program</c> runs it: resolves configuration and the
    /// database on its own, because no host exists at this point.
    /// </summary>
    public static async Task<int> Run(string[] args, TextWriter output, TextWriter error)
    {
        // The working directory is what the web host would use as its content
        // root, so both processes resolve a relative Data Source identically.
        var contentRoot = Directory.GetCurrentDirectory();

        // Same layering the host uses, for the same reason: an environment
        // that overrides the connection string must not leave this command
        // clearing a lock in a different database than the one the service
        // reads.
        var environment = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Production";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(contentRoot)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var options = new DbContextOptionsBuilder<AuthDb>()
            .UseSqlite(AuthDbConnection.Resolve(configuration, contentRoot))
            .Options;

        await using var db = new AuthDb(options);

        // Same startup discipline as the service: create the schema if this is
        // a fresh machine, and refuse to touch a database that predates the
        // model rather than failing with "no such table" halfway through.
        db.Database.EnsureCreated();
        SchemaGuard.VerifyOrThrow(db);

        // The CLI is a one-shot process with nothing to fake: the real clock,
        // same as the service (R1.6a).
        var lockout = new LockoutService(db, LockoutOptions.FromConfiguration(configuration), TimeProvider.System);
        return await Run(args, lockout, output, error);
    }

    /// <summary>The command itself, over an already-opened database.</summary>
    public static async Task<int> Run(string[] args, LockoutService lockout, TextWriter output, TextWriter error)
    {
        if (args.Length != 2 || string.IsNullOrWhiteSpace(args[1]))
        {
            // Never guess at which username was meant — unlocking the wrong
            // one is silent and looks like success.
            error.WriteLine(Usage);
            return UsageError;
        }

        var username = args[1];
        await lockout.Unlock(username);

        // Idempotent, so this says what is true afterwards rather than
        // claiming the account had been locked.
        output.WriteLine($"'{username}' is not locked; its failed login attempts are forgotten.");
        return Success;
    }
}
