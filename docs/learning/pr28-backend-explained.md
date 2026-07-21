# PR #28 Backend, Explained — Continuing the .NET Tour

Companion to `pr27-backend-explained.md`. PR #27 built the login; PR #28 makes
the door actually lock: a new endpoint (`GET /api/auth/session`), a session
lookup with expiry checking, and the tests that pin them. The backend diff is
small — three files — but each teaches a .NET idea worth knowing.

## The 30-second picture

PR #27's flow ended with the browser holding a `sid` cookie. PR #28 answers
the question that cookie exists for: **"who am I, right now?"**

```
GET /api/auth/session            (the browser attaches the sid cookie itself)
   │
   ▼
Program.cs        1. is there a sid cookie at all?        no → 401
   │              2. ask SessionService: is it live?
   ▼
SessionService.FindLive(sid)
   │              look the row up in the Sessions table
   │              found AND not expired → the session
   │              missing OR expired    → null
   ▼
Program.cs        null → 401 (empty body)
                  live → 200 { user{...}, expiresAt }     ← same shape as login
```

The Angular app calls this once at startup (page reload): if it answers 200,
the user is "still logged in" without typing a password; if 401, the login
page appears. That's the whole magic of "reload keeps the session."

## The files

### `SessionService.cs` — one new method, three decisions

```csharp
public async Task<Session?> FindLive(string sid)
{
    var session = await _db.Sessions.SingleOrDefaultAsync(s => s.Sid == sid);
    return session is not null && session.ExpiresAt > DateTimeOffset.UtcNow ? session : null;
}
```

Small, but each piece is a decision:

- **`Task<Session?>` — the nullable return IS the API.** C#'s `Session?`
  is like TypeScript's `Session | null`: the method's signature tells every
  caller "I may give you nothing — handle it." No exceptions for the normal
  "not logged in" case; exceptions are for surprises, and an expired session
  isn't a surprise.
- **`SingleOrDefaultAsync` — LINQ again.** "Find the one row with this key,
  or give me null." Translated to parameterized SQL by EF Core, so there's
  still no injection surface even though `sid` comes straight from a cookie
  an attacker controls.
- **The expiry check happens in C#, not in SQL.** Why: sessions are never
  deleted (that's slice 3), so an expired row still exists in the table. The
  method fetches by key first, then compares `ExpiresAt` in memory. Both the
  missing row and the stale row collapse into the same `null` — callers
  cannot even ask which one it was. That's deliberate: "expired" and "never
  existed" must be indistinguishable to the outside world (see the security
  note below).

Note the comparison direction: `ExpiresAt > UtcNow` means that at the exact
expiry instant the session is already dead — ties go to "locked", the safe
side.

### `Program.cs` — the new endpoint

```csharp
app.MapGet("/api/auth/session", async (SessionService sessions, HttpContext http) =>
{
    if (!http.Request.Cookies.TryGetValue("sid", out var sid) || string.IsNullOrEmpty(sid))
    {
        return Results.Unauthorized();
    }

    var session = await sessions.FindLive(sid);
    if (session is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new
    {
        user = new { username = session.Username, mode = session.Mode, position = session.Position },
        expiresAt = session.ExpiresAt,
    });
});
```

Things to notice:

- **`Cookies.TryGetValue` — the `TryGet` pattern.** .NET's idiom for "might
  not be there": returns `false` instead of throwing, and hands the value
  out through `out var sid`. The `|| string.IsNullOrEmpty(sid)` also catches
  a degenerate `sid=` (empty value) cookie — and satisfies the compiler's
  null-checking, which had flagged the earlier version (a real review
  finding: warning CS8604).
- **Three failure paths, one identical answer.** No cookie, unknown sid,
  expired session — all return `Results.Unauthorized()`: bare 401, empty
  body, nothing logged. A caller (or attacker) cannot learn *why* they were
  rejected, so a captured old cookie reveals nothing about whether it was
  ever valid.
- **Why no error body, when login's 401 has one?** Login's
  `{"error":"invalid_credentials"}` exists so the UI can tell a human what
  went wrong. Nobody ever sees `/session` fail — it's a silent machine
  check at app startup. Sending nothing means promising nothing (once a
  body exists, someone's code will depend on it and it becomes contract
  forever — "Hyrum's law").
- **The reused response shape.** The 200 body is built with the same
  anonymous-object shape as login's. The client can treat "I logged in" and
  "I was already logged in" identically — one `UserSession` type covers
  both.

### `SessionEndpointTests.cs` — testing with cookies, honestly

Two techniques here worth stealing for future tests:

```csharp
private HttpClient CreateClient() =>
    _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
```

**The cookie jar is turned OFF.** Normally the test client behaves like a
browser and re-sends cookies automatically. These tests disable that and
attach the cookie by hand per request (`request.Headers.Add("Cookie", ...)`),
so each test *states exactly which sid travels*. Nothing passes between
requests through hidden client state — a test can't accidentally go green
because a stale cookie tagged along.

```csharp
var (sid, loginBody) = await Login(client);
...
Assert.Equal(loginBody.RootElement.GetProperty("expiresAt").GetString(),
             body.RootElement.GetProperty("expiresAt").GetString());
```

**The "same shape as login" claim is proven, not assumed** — the test logs
in for real, keeps login's response, then compares `/session`'s answer field
by field against it, including the identical `expiresAt`.

The expired-session test uses another trick: it reaches into the test
server's DI container (`_factory.Services.CreateScope()`), grabs the real
`AuthDb`, and rewrites the session row's `ExpiresAt` to the past — then
proves the endpoint says 401. No waiting 24 hours, no fake clock: edit the
row, hit the API. (In-memory SQLite makes this free.)

Also added in this PR, from the previous review's carry-overs: a test that
two logins produce *different* sids (would catch an accidentally
deterministic random generator), and one that the cookie's `Max-Age` equals
`SessionTtlHours × 3600` — proven with a TTL override of 2 hours, so a
hardcoded 24 would fail.

## Security ideas this PR demonstrates

| Idea | Where |
|---|---|
| Fail identically — reveal nothing in errors | Three 401 paths, one response |
| Ties go to the safe side | `>` not `>=` on expiry |
| "Deleted" and "never existed" must look the same | `FindLive` returns null for both |
| Attacker-controlled input still parameterized | `sid` via LINQ, never string SQL |
| Tests must control state explicitly | `HandleCookies = false` |

## Glossary additions (beyond PR #27's)

| Term | Plain meaning | Closest cousin |
|---|---|---|
| `Session?` / nullable reference | "May be null" in the type signature | TS `Session \| null` |
| `TryGetValue` + `out var` | "Might be absent" without exceptions | `map.get()` returning undefined |
| `SingleOrDefaultAsync` | One row by key, or null | `find()` |
| `WebApplicationFactoryClientOptions` | Knobs for the in-memory test client | TestBed configuration |
| Anonymous object `new { ... }` | Shape-only object for JSON responses | TS object literal |
