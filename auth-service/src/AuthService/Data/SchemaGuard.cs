using System.Data;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace AuthService.Data;

/// <summary>
/// Checks that the database on disk actually matches the model before the
/// service starts serving.
///
/// Why this exists: schema management here is <c>EnsureCreated</c>, which
/// creates everything for a NEW database and does nothing at all for one that
/// already exists. So a developer's <c>auth.db</c> from an earlier slice keeps
/// its old schema forever, and the service boots perfectly happily into a
/// state where every login answers 500 (`no such table: LoginAttempts`) — the
/// lock is checked before the credential lookup, so not even the right
/// password gets through.
///
/// Failing to start, naming the file to delete, is the honest answer: the
/// database is dev-grade and disposable (it reseeds itself), while a service
/// that boots but cannot log anyone in is not something anyone should have to
/// diagnose from a stack trace.
///
/// This is a guard, not a migration system. Real migrations belong with the
/// real database engine (see the slice 6 note in the plan); until then this
/// keeps the dev-grade shortcut from failing silently.
/// </summary>
public static class SchemaGuard
{
    /// <summary>
    /// Throws when the database is missing a table or column the model needs,
    /// or when a column is NOT NULL where the model expects nullable (what
    /// R1.2's <c>Sessions.ExpiresAt</c> relaxation looks like on an old file).
    /// </summary>
    public static void VerifyOrThrow(AuthDb db)
    {
        // The probe is a SQLite pragma; other providers get their schema from
        // a real migration story and are not this shortcut's problem.
        if (!db.Database.IsSqlite())
        {
            return;
        }

        var connection = db.Database.GetDbConnection();
        var wasClosed = connection.State != ConnectionState.Open;
        if (wasClosed)
        {
            connection.Open();
        }

        try
        {
            var problems = Compare(db, connection);
            if (problems.Count > 0)
            {
                throw new InvalidOperationException(Report(problems, connection.DataSource));
            }
        }
        finally
        {
            if (wasClosed)
            {
                connection.Close();
            }
        }
    }

    /// <summary>
    /// Every mapped table and column, checked against what SQLite actually
    /// has. Driven by the EF model rather than a hand-written list, so a
    /// future entity or property is covered the day it is added.
    /// </summary>
    private static List<string> Compare(AuthDb db, IDbConnection connection)
    {
        var problems = new List<string>();

        foreach (var entityType in db.Model.GetEntityTypes())
        {
            var table = entityType.GetTableName();
            if (table is null)
            {
                continue;
            }

            var actual = ReadColumns(connection, table);
            if (actual.Count == 0)
            {
                problems.Add($"table '{table}' is missing");
                continue;
            }

            var storeObject = StoreObjectIdentifier.Table(table, entityType.GetSchema());
            foreach (var property in entityType.GetProperties())
            {
                var column = property.GetColumnName(storeObject);
                if (column is null)
                {
                    continue;
                }

                if (!actual.TryGetValue(column, out var isNotNull))
                {
                    problems.Add($"column '{table}.{column}' is missing");
                }
                else if (isNotNull && property.IsNullable)
                {
                    problems.Add($"column '{table}.{column}' is NOT NULL but must accept null");
                }
            }
        }

        return problems;
    }

    /// <summary>Column name → "is NOT NULL", straight from SQLite. Empty when the table does not exist.</summary>
    private static Dictionary<string, bool> ReadColumns(IDbConnection connection, string table)
    {
        using var command = connection.CreateCommand();
        // The table name comes from the EF model, never from user input.
        command.CommandText = $"PRAGMA table_info(\"{table.Replace("\"", "\"\"")}\");";

        var columns = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            columns[reader.GetString(reader.GetOrdinal("name"))] =
                reader.GetInt32(reader.GetOrdinal("notnull")) != 0;
        }

        return columns;
    }

    private static string Report(IEnumerable<string> problems, string databaseFile)
    {
        var message = new StringBuilder()
            .AppendLine("The auth database does not match the current model, so logins would fail at runtime:");
        foreach (var problem in problems)
        {
            message.Append("  - ").AppendLine(problem);
        }

        return message
            .AppendLine()
            .AppendLine("This database was created by an earlier version of the service. EnsureCreated only")
            .AppendLine("creates a schema that is not there yet — it never updates one — so the file has to go.")
            .Append("Stop the service, delete the database (and any -wal/-shm next to it), and start it ")
            .AppendLine("again; it reseeds itself:")
            .Append("  ").Append(databaseFile)
            .ToString();
    }
}
