using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
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

    /// <summary>Distinct from a usage error: the arguments were fine, there was no database to act on.</summary>
    private const int NoDatabase = 2;

    /// <summary>Whether this argv is the unlock command rather than a service start.</summary>
    public static bool Matches(string[] args) => args.Length > 0 && args[0] == Name;

    /// <summary>
    /// The command as <c>Program</c> runs it: resolves configuration and the
    /// database on its own, because no host exists at this point.
    /// </summary>
    public static Task<int> Run(string[] args, TextWriter output, TextWriter error) =>
        // The working directory is what the web host would use as its content
        // root, so both processes resolve a relative Data Source identically.
        Run(args, Directory.GetCurrentDirectory(), output, error);

    /// <summary>
    /// The command against a given content root — the folder a relative
    /// <c>Data Source</c> is resolved from, which in production is the
    /// process's working directory.
    /// </summary>
    public static async Task<int> Run(string[] args, string contentRoot, TextWriter output, TextWriter error)
    {
        // Arguments first, before any database is opened, let alone created:
        // `AuthService unlock` with no username has nothing to do, and doing
        // it in this order is what keeps it from leaving a database behind on
        // its way to printing the usage line.
        if (!TryUsername(args, error, out var username))
        {
            return UsageError;
        }

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

        var connectionString = AuthDbConnection.Resolve(configuration, contentRoot);
        var databasePath = new SqliteConnectionStringBuilder(connectionString).DataSource;

        // The database has to already exist. SQLite creates a file for anyone
        // who opens one, so a command run from the wrong directory would
        // otherwise make an empty database, find no lock in it, and report
        // success — with the real lock still standing. There is no way to tell
        // that apart from a genuine "already unlocked" afterwards, so refuse
        // now and say which file was looked for.
        if (!File.Exists(databasePath))
        {
            error.WriteLine(
                $"no database at '{databasePath}'. " +
                $"Run '{Name}' from the service's folder, or set the 'ConnectionStrings:AuthDb' " +
                $"data source to the database the service uses — nothing was unlocked.");
            return NoDatabase;
        }

        var options = new DbContextOptionsBuilder<AuthDb>().UseSqlite(connectionString).Options;

        await using var db = new AuthDb(options);

        // Same startup discipline as the service: fill in the schema if the
        // file is there but empty, and refuse to touch a database that
        // predates the model rather than failing with "no such table" halfway
        // through.
        db.Database.EnsureCreated();
        SchemaGuard.VerifyOrThrow(db);

        // The CLI is a one-shot process with nothing to fake: the real clock,
        // same as the service (R1.6a).
        var lockout = new LockoutService(db, LockoutOptions.FromConfiguration(configuration), TimeProvider.System);
        return await Run(args, lockout, output, error, databasePath);
    }

    /// <summary>The command itself, over an already-opened database.</summary>
    /// <param name="databasePath">
    /// The file that database came from, named in the confirmation so a
    /// wrong-directory run is visible. Null when the caller opened something
    /// with no path to speak of.
    /// </param>
    public static async Task<int> Run(
        string[] args, LockoutService lockout, TextWriter output, TextWriter error, string? databasePath = null)
    {
        if (!TryUsername(args, error, out var username))
        {
            return UsageError;
        }

        await lockout.Unlock(username);

        // Idempotent, so this says what is true afterwards rather than
        // claiming the account had been locked.
        var inWhich = databasePath is null ? string.Empty : $" (database: {databasePath})";
        output.WriteLine($"'{username}' is not locked; its failed login attempts are forgotten.{inWhich}");
        return Success;
    }

    /// <summary>
    /// The one username the command acts on, or a usage line and false.
    /// Never guesses: unlocking the wrong username is silent and looks exactly
    /// like success.
    /// </summary>
    private static bool TryUsername(string[] args, TextWriter error, out string username)
    {
        if (args.Length != 2 || string.IsNullOrWhiteSpace(args[1]))
        {
            error.WriteLine(Usage);
            username = string.Empty;
            return false;
        }

        username = args[1];
        return true;
    }
}
