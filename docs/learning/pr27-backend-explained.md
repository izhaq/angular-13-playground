# PR #27 Backend, Explained — a .NET Tour for Angular Developers

A file-by-file walkthrough of the auth-service changes in PR #27 (slice 1:
the login happy path). Written for someone who knows Angular well and is new
to .NET. Every snippet below is real code from this PR.

## The 30-second picture

A login request travels through the files like this:

```
POST /api/auth/login  { username, password, mode, position }
   │
   ▼
Program.cs            the endpoint — receives the request, orchestrates everything
   │ 1. valid shape?          → Sessions/LoginRequest.cs
   │ 2. find the user         → Data/AuthDb.cs → Users table (SQLite)
   │ 3. check the password    → Sessions/Pbkdf2.cs
   │ 4. create the session    → Sessions/SessionService.cs → Sessions table
   │ 5. set the sid cookie, return the JSON body
   ▼
200 { user: {...}, expiresAt } + Set-Cookie: sid=...
```

And the two tables come to exist because at startup `Program.cs` runs
`EnsureCreated()` (build the schema if missing) and `SeedData.EnsureSeeded()`
(insert the two users if the table is empty).

## The files, one by one

### `Data/User.cs` and `Data/Session.cs` — the table shapes

```csharp
public class User
{
    public string Username { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
}
```

These are **entities**: plain classes that describe a database row, the way a
TypeScript interface describes an object. No SQL here — EF Core (the data
layer) reads these classes and derives the tables from them: class name →
table, property → column. `Session` is the same idea: `Sid`, `Username`,
`Mode`, `Position`, `ExpiresAt` — one row per live login.

The odd `= null!` is C# strict-null-checking appeasement: "this will never
be null at runtime (EF fills it), stop warning me" — the C# cousin of
TypeScript's `!` non-null assertion.

### `Data/AuthDb.cs` — the database handle

```csharp
public class AuthDb : DbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Session> Sessions => Set<Session>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasKey(u => u.Username);
        modelBuilder.Entity<Session>().HasKey(s => s.Sid);
    }
}
```

`DbContext` is EF Core's "connection + query builder" object — the closest
Angular analogy is an injectable data service wrapping HttpClient, except it
wraps the database. Each `DbSet<T>` property is a queryable table: LINQ
expressions like `db.Users.SingleOrDefaultAsync(u => u.Username == name)`
get translated into parameterized SQL for you (that's also why SQL injection
isn't possible here — you never concatenate SQL strings).

`OnModelCreating` declares the primary keys. Everything else (column types,
lengths) uses conventions — sensible defaults derived from the C# types.

### `Data/SeedData.cs` — where the two users come from

Answering the review question directly: there is no registration screen, by
design (the spec says accounts are *seeded, not managed*). So someone must
put the two users into the database. That someone is this file:

```csharp
public static void EnsureSeeded(AuthDb db)
{
    if (db.Users.Any())   // already seeded? do nothing (idempotent)
    {
        return;
    }

    db.Users.AddRange(
        new User { Username = "operation",  PasswordHash = Pbkdf2.Hash("operation123!") },
        new User { Username = "technician", PasswordHash = Pbkdf2.Hash("technician123!") });
    db.SaveChanges();
}
```

Called once at startup. The `Any()` guard makes restarts safe — no duplicate
users. Two consequences worth knowing:

- The passwords are hashed **at seed time**; the database never stores
  `operation123!`, only its PBKDF2 hash.
- The guard also means changing the seed values later does nothing while an
  old `auth.db` exists — delete the file and it reseeds fresh on next run.

### `Sessions/LoginRequest.cs` — the request body + its validation

```csharp
public record LoginRequest(string? Username, string? Password, string? Mode, string? Position)
{
    public bool IsValid() =>
        !string.IsNullOrWhiteSpace(Username) &&
        !string.IsNullOrWhiteSpace(Password) &&
        Modes.Contains(Mode) &&
        Positions.Contains(Position);
}
```

A `record` is C#'s concise immutable data class — think a TypeScript
interface that also generates its own constructor and equality. ASP.NET
automatically deserializes the JSON body into it (like Angular's HttpClient
typing, but enforced at runtime). Every field is nullable (`string?`) **on
purpose**: a missing JSON field then binds as `null` instead of blowing up
mid-deserialization, and `IsValid()` gets to decide — which is how the
endpoint returns the contract's clean `400 invalid_request` instead of a
framework error page.

### `Sessions/Pbkdf2.cs` — password hashing (the security-critical file)

Full detail omitted here (see the file; it's 45 lines), but the three ideas:

1. **Passwords are never stored — hashes are.** `Hash()` runs the password
   through PBKDF2-HMAC-SHA256 600,000 times with a random per-user salt, and
   stores `pbkdf2-sha256$600000$<salt>$<hash>` in one column. Verifying
   re-runs the same math and compares. The point of 600k rounds: stealing
   the database still makes guessing passwords expensive.
2. **Comparison is fixed-time** (`CryptographicOperations.FixedTimeEquals`) —
   comparing byte-by-byte with early exit would leak information through
   response timing.
3. **`DummyHash`** exists for logins with an unknown username: the endpoint
   still verifies against this throwaway hash so "user doesn't exist" and
   "wrong password" take the same time and return the same response. Without
   it, an attacker could discover which usernames exist by timing.

### `Sessions/SessionService.cs` — creates the session row

```csharp
public async Task<Session> Create(string username, string mode, string position)
{
    var session = new Session
    {
        Sid = NewSid(),                                  // 32 crypto-random bytes
        Username = username, Mode = mode, Position = position,
        ExpiresAt = DateTimeOffset.UtcNow.Add(_ttl),     // TTL from config
    };
    _db.Sessions.Add(session);
    await _db.SaveChangesAsync();
    return session;
}
```

An injectable service (registered in Program.cs — .NET has built-in
dependency injection, same concept as Angular's). Its constructor reads
`SessionTtlHours` from configuration (default 24) — that's the "configurable
session lifetime" requirement, live. `NewSid()` produces the cookie value:
256 random bits, base64url-encoded so it's cookie-safe. This is the "proof
of login" from the spec — meaningless by itself, a key into the Sessions
table.

### `Program.cs` — the conductor

Two halves. **Startup** (runs once):

```csharp
builder.Services.AddDbContext<AuthDb>(options => options.UseSqlite(connection.ToString()));
builder.Services.AddScoped<SessionService>();       // DI registrations — like Angular providers

builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
    policy.WithOrigins(allowedOrigin).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

using (var scope = app.Services.CreateScope())      // build schema + seed users
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDb>();
    db.Database.EnsureCreated();
    SeedData.EnsureSeeded(db);
}
```

`AddDbContext` / `AddScoped` are provider registrations — Angular's
`providers: [...]`, same mental model ("scoped" = one instance per HTTP
request). The CORS policy answers the other review question: the exact
origin comes from the `AllowedOrigin` config value — **per-environment
configuration, only needed if the real deployment uses the CORS path rather
than a reverse proxy** (with a proxy, this policy simply never activates).
There's also a small path trick above this snippet: the SQLite file path is
pinned to the service's own folder, so starting from the repo root doesn't
scatter `auth.db` files around.

**The endpoint** (runs per request) — this is the data flow made concrete:

```csharp
app.MapPost("/api/auth/login", async (LoginRequest request, AuthDb db, SessionService sessions, HttpContext http) =>
{
    if (!request.IsValid())
        return Results.Json(new { error = "invalid_request" }, statusCode: 400);

    var user = await db.Users.SingleOrDefaultAsync(u => u.Username == request.Username);

    var verified = Pbkdf2.Verify(request.Password!, user?.PasswordHash ?? Pbkdf2.DummyHash);
    if (user is null || !verified)
        return Results.Json(new { error = "invalid_credentials" }, statusCode: 401);

    var session = await sessions.Create(user.Username, request.Mode!, request.Position!);

    http.Response.Cookies.Append("sid", session.Sid, new CookieOptions
    {
        HttpOnly = true, SameSite = SameSiteMode.Lax, Path = "/", MaxAge = sessions.Ttl,
    });

    return Results.Ok(new
    {
        user = new { username = user.Username, mode = session.Mode, position = session.Position },
        expiresAt = session.ExpiresAt,
    });
});
```

Note the parameters `(LoginRequest request, AuthDb db, SessionService
sessions, ...)`: ASP.NET fills each one automatically — the body gets
deserialized into `request`, and the services are injected from DI. It's as
if an Angular component's constructor and an `@Input()` were merged into one
argument list. Also note the *order of checks*: shape first (400), then the
combined user+password check (single 401 — never revealing which part
failed), and only then any state change.

### `appsettings.json` — three new keys

```json
"ConnectionStrings": { "AuthDb": "Data Source=auth.db" },
"SessionTtlHours": 24,
"AllowedOrigin": "http://localhost:4200"
```

All three are per-environment knobs. In deployment each environment can
override any of them with environment variables (.NET merges configuration
from appsettings → env vars automatically — no code involved).

### The tests — `AuthServiceFactory.cs` + `LoginEndpointTests.cs`

The factory boots the **real** `Program.cs` in memory, but swaps the database
for an in-memory SQLite connection (held open for the fixture's lifetime —
close it and the in-memory DB evaporates). So every test exercises the true
pipeline — routing, DI, validation, hashing, seeding — with zero files and
zero network. The 10 login tests then pin the contract: exact status codes,
exact JSON fields, every cookie attribute (including the *absence* of
`Secure`), and that the unknown-user and wrong-password responses are
byte-identical.

## Glossary (the .NET words used above)

| Term | Plain meaning | Angular cousin |
|---|---|---|
| Entity | Class describing a DB row | Interface for a model |
| `DbContext` / `DbSet` | DB handle / one queryable table | Injectable data service |
| EF Core | The ORM — turns LINQ into SQL | (no direct equivalent) |
| DI / `AddScoped` | Built-in dependency injection | `providers: [...]` |
| `record` | Concise immutable data class | Interface + constructor |
| Minimal API | Endpoint = one `MapPost(...)` call | Express-style routing |
| `EnsureCreated` | Create schema if missing (dev-grade) | — (migrations replace it later) |
| Seeding | Inserting the initial data an app needs | — |
