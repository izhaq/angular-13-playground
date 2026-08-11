# Auth Service — What It Does and How to Configure It

A small, standalone login service. It answers three questions for a client
app: *who are you*, *are you still logged in*, and *log me out*.

Written in C# (.NET 10), runs on its own, keeps its data in a single file.
Nothing else in the system depends on how it works inside — only on the three
HTTP endpoints below.

---

## 1. What it is, in one minute

Two people use the system: an **Operation** user (the station in control) and
a **Technician** user (the read-only monitoring station). This service checks
their password and remembers that they are logged in.

**How "remembering" works.** HTTP has no memory — every request arrives
alone. So when you log in, the service:

1. checks your password,
2. writes a row in its `Sessions` table,
3. hands the browser a cookie containing a long random id (`sid`).

That id means nothing by itself. It is just a key into the table. On every
later request the browser sends the cookie back automatically, the service
looks the id up, and knows who you are.

The cookie is marked `HttpOnly`, which means **JavaScript cannot read it**.
Even a script injected into the page cannot steal the session.

**Why not JWT?** A JWT would let the service forget everything and just check
a signature. But then logging out cannot really log you out (the token stays
valid until it expires), and the service can never know who is logged in
*right now*. Both matter here, so sessions won.

**Assumptions this service is built on:** a closed network, no internet, no
Active Directory or SSO, and exactly two accounts that are created for it.

---

## 2. What it supports

| Capability | Summary |
|---|---|
| **Login** | Username + password + mode + position → a session cookie. |
| **Logout** | Really ends the session — the row is deleted, the cookie cleared. |
| **Session restore** | The app asks "am I still logged in?" after a page reload. |
| **Never-expiring sessions** | By default a session lasts until logout, surviving browser and station restarts. Timed expiry is available if you want it. |
| **Password hashing** | PBKDF2-SHA256, 600,000 iterations, 16-byte random salt per user. Passwords are never stored. |
| **Login lockout** | After N wrong passwords a username is refused for a while. Optional — off if you don't configure it. |
| **Manual unlock** | Release a locked account immediately, from the station, without logging in. |
| **Rate limiting** | Optional cap on login attempts per caller. Off unless configured. |
| **Consistent error bodies** | Every rejection answers in the same documented shape — never a bare framework error. |
| **API description** | An OpenAPI document, in Development only. |
| **Startup schema check** | Refuses to start on a database that doesn't match the code, instead of failing every login later. |

### What it does NOT do (on purpose)

No account creation, password change, or password reset. No admin UI. No
multi-factor authentication. No enforcement of "only one Operation user at a
time" (the data to add it exists; the rule is not written). The two accounts
are seeded by the service itself.

---

## 3. The HTTP API

Three endpoints. All live under `/api/auth`. This is the contract the client
implements — it is defined in `specs/3-login-auth/spec.md`, which stays the
authoritative source.

### `POST /api/auth/login`

```json
{ "username": "operation", "password": "…", "mode": "operation", "position": "active" }
```

`mode` is `operation` or `technician`; `position` is `active` or `passive`.

| Response | Meaning |
|---|---|
| `200` + body below, and `Set-Cookie: sid=…` | Logged in. |
| `401 {"error":"invalid_credentials"}` | Wrong password **or** unknown username — deliberately the same answer. |
| `423 {"error":"locked"}` | Too many failed attempts (see lockout). |
| `400 {"error":"invalid_request"}` | Missing field, wrong type, or a body that isn't valid JSON. |

Success body:

```json
{
  "user": { "username": "operation", "mode": "operation", "position": "active" },
  "expiresAt": null
}
```

`expiresAt` is **null when sessions never expire** (the default). If you turn
on timed expiry it is an ISO-8601 timestamp. Any client reading this field
must handle `null`.

### `POST /api/auth/logout`

Always answers `204`, deletes the session row, and clears the cookie. Safe to
call twice, or with no cookie at all — it never reveals whether there was
anything to delete.

### `GET /api/auth/session`

The client calls this when the app starts, to survive a page reload.

- `200` with the same body as login — still logged in.
- `401`, no body — not logged in, or the session is gone.

### Two things that are *not* part of this API

- **`/api/auth/health`** — a liveness probe (`{"status":"ok"}`). Nothing
  implements against it.
- **`/admin/unlock`** — an operator action, not a client action. It is not in
  the published API description, and it is never reachable on the public port.
  See §6.

---

## 4. Running it

```bash
# From the repo root (the convenience script):
npm run auth-service

# Or directly:
dotnet run --project auth-service/src/AuthService
```

It listens on **http://localhost:5001** by default.

In development the Angular dev proxy forwards `/api/auth/*` to this port, so
the browser sees one address and cookies flow with no extra setup. In
production the same job is done by nginx or an ingress.

### The seeded accounts

Created automatically on first run, **only if the user table is empty**:

| Username | Password |
|---|---|
| `operation` | `operation123!` |
| `technician` | `technician123!` |

These are obviously fake dev passwords. Changing the seed values in code does
nothing while an old `auth.db` exists — delete the file and it reseeds.

### The unlock command

```bash
AuthService unlock operation
# in dev:
dotnet run --project auth-service/src/AuthService -- unlock operation
```

Clears a lock and forgets the failed-attempt count. It works **with the
service stopped** — it opens the same database directly.

| Exit code | Meaning |
|---|---|
| `0` | Done (also when the account wasn't locked — nothing to do is success). |
| `1` | Wrong usage (no username, or too many arguments). |
| `2` | No database found at the resolved path — it prints the path it looked at. |

It prints the database path on success too, so a run from the wrong directory
is visible rather than silently doing nothing.

---

## 5. Configuration reference

All settings live in `auth-service/src/AuthService/appsettings.json` (which
carries comments explaining each key). Three ways to set any of them:

```bash
# 1. edit appsettings.json
# 2. environment variable — nested keys use double underscore:
LoginRateLimit__PermitLimit=10 dotnet run …
# 3. command line:
dotnet run … --MaxLoginAttempts=3
```

**A rule that applies to every setting below:** a value the service cannot
honour exactly as written **stops it at startup with a message naming the
key**. It never quietly reinterprets your configuration.

### Sessions

| Key | Default | What it does |
|---|---|---|
| `SessionTtlHours` | `null` | **`null` = sessions never expire** — only logout ends them, and the cookie survives browser/station restarts (10-year cookie lifetime). Set a number to make sessions expire that many hours after login; then `expiresAt` is a timestamp and an expired session answers `401`. Must be greater than 0. |

*When to change it:* leave `null` for control stations, where being logged out
mid-shift is worse than a long session. Set a number if a site policy requires
timed re-authentication.

### Login lockout

| Key | Default | What it does |
|---|---|---|
| `MaxLoginAttempts` | `5` | How many consecutive failures before the username is locked. **Remove the key (or set `null`) to switch the whole lockout mechanism off** — nothing is counted, nothing is stored, `423` is never returned. Must be greater than 0. |
| `LockoutMinutes` | `15` | How long a lock holds before it lifts by itself. Only read when lockout is on. Must be greater than 0. |

How it behaves when on:

- The **Nth failure itself** answers `423` — you learn why on the attempt that
  caused it, not on the next one.
- A **successful login resets** the counter.
- Attempts made **while locked do not extend** the window.
- The lock is checked **before the password**, so the right password is still
  refused while locked.
- Failures are counted against the **username you typed**, even if no such
  user exists — so `423`-vs-`401` never reveals which accounts are real.
- Locks are stored in the database and survive a service restart.
- A malformed request is **not** counted — otherwise anyone could lock an
  operator out with garbage.

*Known risk, accepted:* anyone who can reach the login endpoint can keep both
accounts locked (5 tries per 15 minutes). This is accepted **because there is
a way out** — an operator at the station can unlock immediately (§6). Set
`MaxLoginAttempts` to `null` if your site prefers no lockout at all.

### Operator endpoints

| Key | Default | What it does |
|---|---|---|
| `AdminUrls` | `null` (off) | A **loopback** address with its own port, e.g. `"http://127.0.0.1:5051"`. The service then binds a second listener there and serves `POST /admin/unlock` **only on it**. |

Startup refuses: a non-loopback address (e.g. `0.0.0.0`), or a port already
used by the public API. See §6 for why this is a separate listener rather than
an "only allow localhost" check.

You do not need this at all — the `unlock` command does the same job with no
network surface.

### Login rate limit

| Key | Default | What it does |
|---|---|---|
| `LoginRateLimit:PermitLimit` | `null` (off) | Login attempts one caller may make per window before the service answers `429`. `null` means no limiter is registered at all. Must be greater than 0. |
| `LoginRateLimit:WindowSeconds` | `60` | How long a window lasts. Must be greater than 0. |

Applies to **login only** — not to session-restore or logout, which a page
reload calls (limiting those would log a station out for refreshing).

⚠️ **Important limitation.** The budget is per *connecting peer*. Behind a
reverse proxy **on the same machine** — the recommended deployment — every
request has the same peer, so this becomes **one global login budget**:
whoever spends it keeps everyone out of the login page, operators included.
Making it truly per-caller would mean trusting the `X-Forwarded-For` header,
which is only safe when paired with `UseForwardedHeaders` + `KnownProxies` —
deliberately not wired, because a limiter an attacker can partition themselves
out of is worse than none. Turn this on with that in mind.

`429` is deliberately **not** part of the client contract; the login page
treats it as an unexpected status and shows its generic message.

### Infrastructure

| Key | Default | What it does |
|---|---|---|
| `Urls` | `http://localhost:5001` | Where the public API listens. |
| `ConnectionStrings:AuthDb` | `Data Source=auth.db` | The database file. A relative path is resolved against the service folder, so starting from the repo root doesn't scatter database files. |
| `AllowedOrigin` | `http://localhost:4200` | The exact web address allowed to call this service from a browser with cookies. Must be exact — a `*` wildcard is forbidden by browsers when cookies are involved. |

---

## 6. Security model, in plain words

**Passwords are never stored.** Only a PBKDF2-SHA256 hash with 600,000
iterations and a per-user random salt. Stealing the database still makes
guessing expensive. Comparison is fixed-time, so response timing leaks
nothing.

**Unknown username and wrong password are indistinguishable.** An unknown
username is still verified against a throwaway hash, so both paths cost the
same time *and* return the same answer. Nobody can discover which accounts
exist by probing.

**The session id is unguessable.** 32 random bytes (256 bits) from a
cryptographic generator, never sequential.

**The cookie cannot be stolen by scripts** (`HttpOnly`), and is scoped
`SameSite=Lax`, `Path=/`.
*Production note:* there is no `Secure` flag, because development runs on
plain HTTP. **A production deployment behind TLS should add it.**

**The lock is checked before the password.** That single ordering buys three
properties at once: a locked account is refused even with the right password,
attempts while locked can't extend the window, and `423` reveals nothing about
whether the username exists.

**The admin unlock endpoint is protected by *where it listens*, not by what
requests claim.** The obvious approach — "only accept requests from
localhost" — is unsafe here: with a reverse proxy on the same machine, every
proxied request *looks* local, from anywhere on the network. Instead the
endpoint is served on a separate listener bound to loopback, and the service
verifies two facts about the socket: the connection arrived on an admin port,
**and** the address it was accepted on is loopback. Neither can be forged by a
header or a proxy. On top of that, startup checks what the server *actually*
bound and refuses to run if the admin listener isn't loopback-only.

**Errors never leak.** Every rejection uses the same documented shape; no
stack traces, no passwords or hashes in logs, no hint about which part of a
login failed.

---

## 7. The database

A single **SQLite** file (`auth.db`), created next to the service.

| Table | Holds |
|---|---|
| `Users` | The two seeded accounts and their password hashes. |
| `Sessions` | One row per live login: id, username, mode, position, expiry. |
| `LoginAttempts` | Failure counts and lock times per username. |

**Schema handling is dev-grade.** The service creates the schema on first run
(`EnsureCreated`) — which does nothing if the file already exists. So an old
database from an earlier version keeps its old shape. A **schema guard**
catches exactly that: on startup it compares the file against the code and, if
they disagree, refuses to start with a message naming the file to delete.
Better than booting into a service where every login fails.

**To reset:** stop the service, delete `auth.db`, start it. The schema and the
two seeded users are recreated.

**Swapping to a real database** (SQL Server, Postgres…) is a provider package
plus a connection string — all data access goes through EF Core with LINQ, no
raw SQL anywhere. Two things need doing at that point: replace `EnsureCreated`
with real EF migrations, and revisit the schema guard (it currently uses a
SQLite-specific check).

---

## 8. Gotchas worth knowing

- **Changed the seeded passwords in code and nothing happened?** Seeding only
  runs when the user table is empty. Delete `auth.db`.
- **Service won't start, complains about the database?** That's the schema
  guard. Delete the file it names.
- **`unlock` said "forgotten" but the account is still locked?** Check the
  database path it printed — you probably ran it from a different folder.
- **Turned on the rate limiter and everyone got locked out?** See the proxy
  limitation in §5.
- **`expiresAt` is `null`** — that's normal, it means "never expires". Don't
  treat it as an error.
- **A `423` on the very first attempt** means the account was already locked
  from earlier failures; locks survive restarts.
