using Microsoft.Data.Sqlite;

namespace AuthService.Data;

/// <summary>
/// Where the SQLite file is, decided in one place.
///
/// Two processes open this database: the service, and the
/// <c>AuthService unlock</c> command (R1.5b) — which exists precisely so it
/// can run while the service is stopped. If they disagreed about the path, the
/// command would cheerfully unlock a username in a database nobody reads.
/// </summary>
public static class AuthDbConnection
{
    private const string Fallback = "Data Source=auth.db";

    /// <summary>
    /// The connection string with a relative <c>Data Source</c> pinned to the
    /// content root, so the file is found regardless of the process's working
    /// directory (<c>npm run auth-service</c> starts from the repo root).
    /// </summary>
    public static string Resolve(IConfiguration configuration, string contentRoot)
    {
        var connection = new SqliteConnectionStringBuilder(
            configuration.GetConnectionString("AuthDb") ?? Fallback);

        if (!Path.IsPathRooted(connection.DataSource))
        {
            connection.DataSource = Path.Combine(contentRoot, connection.DataSource);
        }

        return connection.ToString();
    }
}
