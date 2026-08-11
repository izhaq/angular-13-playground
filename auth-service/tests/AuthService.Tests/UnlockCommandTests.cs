using AuthService.Admin;
using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Tests;

/// <summary>
/// R1.5b — <c>AuthService unlock &lt;username&gt;</c>, the primary manual
/// release (spec "Manual unlock").
///
/// Why a command and not just an endpoint: someone locked out cannot log in to
/// free themselves, so the release must not require a login — and it must work
/// with the service STOPPED, which rules out anything that needs the web host.
/// It reaches the same rows through the same EF seam, never raw SQL.
///
/// The command is exercised here through the same entry point <c>Program</c>
/// calls, with an in-memory database and captured console writers, so the
/// argument handling and the exit codes are pinned rather than described.
/// </summary>
public class UnlockCommandTests : IDisposable
{
    private const int MaxAttempts = 3;

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly AuthDb _db;
    private readonly TestTimeProvider _clock = new();
    private readonly LockoutService _lockout;
    private readonly StringWriter _output = new();
    private readonly StringWriter _error = new();

    public UnlockCommandTests()
    {
        _connection.Open();
        _db = new AuthDb(new DbContextOptionsBuilder<AuthDb>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        _lockout = new LockoutService(_db, LockoutOptions.On(MaxAttempts, TimeSpan.FromMinutes(15)), _clock);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();

        foreach (var folder in _tempFolders)
        {
            Directory.Delete(folder, recursive: true);
        }
    }

    private readonly List<string> _tempFolders = [];

    /// <summary>A directory with no <c>auth.db</c> in it — i.e. "run from the wrong folder".</summary>
    private string EmptyFolder()
    {
        var folder = Directory.CreateTempSubdirectory("authservice-unlock-").FullName;
        _tempFolders.Add(folder);
        return folder;
    }

    private Task<int> Run(params string[] args) => UnlockCommand.Run(args, _lockout, _output, _error);

    private async Task LockOut(string username)
    {
        for (var i = 0; i < MaxAttempts; i++)
        {
            await _lockout.RecordFailure(username);
        }

        Assert.True(await _lockout.IsLocked(username));
    }

    [Fact]
    public async Task Unlocking_a_locked_username_releases_it_and_exits_zero()
    {
        await LockOut("operation");

        var exitCode = await Run("unlock", "operation");

        Assert.Equal(0, exitCode);
        Assert.False(await _lockout.IsLocked("operation"));
    }

    [Fact]
    public async Task Unlocking_forgets_the_counter_too_so_the_next_failure_is_the_first()
    {
        // Clearing only the lock would leave the user one slip from being
        // locked straight back out — the release has to be a real release.
        await LockOut("operation");

        await Run("unlock", "operation");

        Assert.False(await _lockout.RecordFailure("operation"));
        Assert.Equal(1, _db.LoginAttempts.AsNoTracking().Single(a => a.Username == "operation").FailedCount);
    }

    [Fact]
    public async Task It_prints_a_short_confirmation_naming_the_username()
    {
        await LockOut("operation");

        await Run("unlock", "operation");

        Assert.Contains("operation", _output.ToString());
    }

    [Fact]
    public async Task An_unknown_username_is_still_a_success()
    {
        // Idempotent on purpose: the operator running this at 3am should not
        // have to know whether the account was locked, or whether it exists.
        var exitCode = await Run("unlock", "nobody-at-all");

        Assert.Equal(0, exitCode);
        Assert.Empty(_error.ToString());
    }

    [Fact]
    public async Task A_missing_username_fails_with_usage()
    {
        var exitCode = await Run("unlock");

        Assert.NotEqual(0, exitCode);
        Assert.Contains("unlock", _error.ToString());
        Assert.Contains("username", _error.ToString());
    }

    [Fact]
    public async Task A_blank_username_fails_with_usage()
    {
        var exitCode = await Run("unlock", "   ");

        Assert.NotEqual(0, exitCode);
        Assert.Contains("username", _error.ToString());
    }

    [Fact]
    public async Task Extra_arguments_fail_with_usage_rather_than_unlocking_the_first_one()
    {
        await LockOut("operation");

        var exitCode = await Run("unlock", "operation", "technician");

        Assert.NotEqual(0, exitCode);
        Assert.True(await _lockout.IsLocked("operation")); // nothing guessed at
    }

    // ---------------------------------------------------------------------
    // The command as the OPERATOR runs it: a folder on disk rather than an
    // already-opened database.
    //
    // This is where the command is most easily believed and wrong. It resolves
    // its database relative to the working directory, so running the binary
    // from anywhere else used to CREATE a brand-new empty auth.db, find no
    // lock in it (there is nothing in it), print a cheerful confirmation and
    // exit 0 — while the real lock stood untouched. AuthDbConnection's own doc
    // comment names this failure.
    // ---------------------------------------------------------------------

    [Fact]
    public async Task A_missing_database_is_refused_by_path_and_nothing_is_created()
    {
        var folder = EmptyFolder();

        var exitCode = await UnlockCommand.Run(["unlock", "operation"], folder, _output, _error);

        // Non-zero, because nothing was unlocked.
        Assert.NotEqual(0, exitCode);

        // The resolved path, because "wrong directory" is invisible otherwise.
        Assert.Contains(Path.Combine(folder, "auth.db"), _error.ToString());

        // And emphatically no new database: creating one is what made the old
        // behaviour a silent lie rather than an error.
        Assert.Empty(Directory.GetFiles(folder));
    }

    [Fact]
    public async Task A_missing_username_is_refused_before_any_database_is_touched()
    {
        // `AuthService unlock` with no username used to create auth.db and
        // then print usage. Argument checking costs nothing; do it first.
        var folder = EmptyFolder();

        var exitCode = await UnlockCommand.Run(["unlock"], folder, _output, _error);

        Assert.NotEqual(0, exitCode);
        Assert.Contains("username", _error.ToString());
        Assert.Empty(Directory.GetFiles(folder));
    }

    [Fact]
    public async Task A_real_database_is_opened_and_the_success_line_names_it()
    {
        var folder = EmptyFolder();
        var path = Path.Combine(folder, "auth.db");

        await using (var db = new AuthDb(new DbContextOptionsBuilder<AuthDb>()
            .UseSqlite($"Data Source={path}").Options))
        {
            await db.Database.EnsureCreatedAsync();
        }

        var exitCode = await UnlockCommand.Run(["unlock", "operation"], folder, _output, _error);

        Assert.Equal(0, exitCode);
        Assert.Empty(_error.ToString());

        // Naming the file it actually opened is what lets an operator see at a
        // glance that they released a lock in the database they meant to.
        Assert.Contains(path, _output.ToString());
    }

    [Fact]
    public void The_command_claims_only_the_unlock_argv()
    {
        // Program hands over to the command BEFORE building the web host, so
        // this predicate decides whether the service starts at all.
        Assert.True(UnlockCommand.Matches(["unlock", "operation"]));
        Assert.True(UnlockCommand.Matches(["unlock"]));

        Assert.False(UnlockCommand.Matches([]));
        Assert.False(UnlockCommand.Matches(["--MaxLoginAttempts=5"]));
        Assert.False(UnlockCommand.Matches(["--AdminUrls=http://127.0.0.1:5051"]));
    }
}
