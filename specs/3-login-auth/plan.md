# Implementation Plan: Login & Authentication Module

**Spec:** `specs/3-login-auth/spec.md` (approved 2026-07-12)
**Strategy:** vertical slices — every slice ships backend + frontend together
and ends in something you can open in a browser and review. A slice = a
review checkpoint. Tasks inside a slice stay small (≤5 files each).

## Overview

Six slices. Slice 0 proves the plumbing; slices 1–4 build the login flow
end-to-end, one user-visible behavior at a time; slice 5 adds the auth-free
runtime mode; slice 6 proves extraction. After every slice: tests pass, both
services run, and there is something new to see.

## Architecture Decisions (from the approved spec)

- Session cookie (Option A), HttpOnly, opaque id, server-side session table.
- **.NET 10** minimal API (org's version, current LTS — retargeted from
  .NET 6 in R1.1, so the EOL trade-off is gone) in self-contained
  `auth-service/` (port 5001); EF Core 10 + SQLite; Node server stays as the
  experiments service (port 3000).
- Client: standalone components + signals, flat `features/auth/` (8 files),
  `provideAuth()` as the wiring seam.
- Runtime `app-config.json` switches real/mock auth; missing file = auth ON.
- Password hashing: PBKDF2 via `Rfc2898DeriveBytes` (built into .NET — no
  extra dependency).

## Technical Architecture

```
┌─────────────────────────── Browser ───────────────────────────┐
│  Angular app (localhost:4200)                                  │
│                                                                │
│  login-page ──▶ SessionStore (signals) ◀── auth.guard          │
│                   │        ▲                                   │
│                   ▼        │ fills                             │
│               AUTH_API token ── real: AuthApiService (HTTP)    │
│               (picked by      └ mock: AuthApiMockService       │
│                provideAuth from app-config.json)               │
│                   │                                            │
│  unauthorized.interceptor (watches every response for 401)     │
└───────────────────┼────────────────────────────────────────────┘
                    │ HTTP (cookie attached by the browser)
        ┌───────────▼───────────┐  dev proxy = reverse proxy role
        │  /api/auth/* → :5001  │──▶ auth-service (.NET 10)
        │  /api/*      → :3000  │──▶ experiments service (Node)
        └───────────────────────┘         │
                              ┌───────────▼───────────┐
                              │ auth-service           │
                              │  minimal API endpoints │
                              │  Sessions logic        │
                              │  EF Core 10 ──▶ SQLite │
                              │  (Users, Sessions)     │
                              └────────────────────────┘
```

The one rule that keeps it extractable: **everything left of the proxy reads
only `SessionStore`; everything right of it reads only the `Sessions` table.
The cookie travels between them, touched by neither side's app code.**

### Data flow: login (happy path)

```
user submits form
  → SessionStore.login({username, password, mode, position})
    → POST /api/auth/login (withCredentials)
      → endpoint: verify PBKDF2 hash → insert Sessions row
      → 200 {user, expiresAt} + Set-Cookie: sid=…; HttpOnly; SameSite=Lax
    → store._user.set(user)  →  isLoggedIn() flips true
  → router.navigate(returnUrl ?? '/system-experiments')
```

### Data flow: page reload (session restore)

```
APP_INITIALIZER (provideAuth)
  → GET /api/auth/session   (browser attaches sid cookie by itself)
    → 200 → store filled before routing starts → user lands where they were
    → 401 → store stays null → auth.guard redirects to /login
```

### Data flow: expiry / take-over (any time)

```
any API call → 401
  → unauthorized.interceptor: store.clear() → router.navigate ['/login']
```

## Key Interfaces (the contract, in code)

`features/auth/auth-contract.ts` — the whole shared vocabulary:

```ts
export type Mode = 'operation' | 'technician';
export type Position = 'active' | 'passive';

export interface LoginRequest {
  username: string; password: string; mode: Mode; position: Position;
}
export interface UserSession {
  user: { username: string; mode: Mode; position: Position };
  expiresAt: string;                     // ISO-8601
}
export type AuthError = 'invalid_credentials' | 'locked' | 'invalid_request';

export interface AuthApi {                // implemented by real + mock
  login(req: LoginRequest): Observable<UserSession>;
  logout(): Observable<void>;
  session(): Observable<UserSession>;
}
export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API');
```

`session.store.ts` — signals, the only state the app reads:

```ts
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(AUTH_API);
  private readonly _user = signal<UserSession | null>(null);

  readonly session = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  login(req: LoginRequest) { /* api.login → tap(s => this._user.set(s)) */ }
  clear() { this._user.set(null); }
}
```

`auth.guard.ts`:

```ts
export const authGuard: CanActivateFn = (_, state) => {
  const store = inject(SessionStore);
  return store.isLoggedIn()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```

`auth-service` login endpoint (.NET 10 minimal API, shape only):

```csharp
app.MapPost("/api/auth/login", async (LoginRequest req, AuthDb db, Sessions sessions) =>
{
    var user = await db.Users.SingleOrDefaultAsync(u => u.Username == req.Username);
    if (user is null || !Pbkdf2.Verify(req.Password, user.PasswordHash))
        return Results.Json(new { error = "invalid_credentials" }, statusCode: 401);

    var s = await sessions.Create(user.Username, req.Mode, req.Position); // crypto-random sid
    // cookie: HttpOnly, SameSite=Lax, MaxAge = TTL  (no Secure in dev — plain HTTP)
    return Results.Ok(new { user = new { user.Username, req.Mode, req.Position },
                            expiresAt = s.ExpiresAt });
});
```

EF Core 10 entities (SQLite):

```csharp
public record User    { public string Username; public string PasswordHash; }
public record Session { public string Sid; public string Username;
                        public string Mode; public string Position;
                        public DateTimeOffset ExpiresAt; }
// AuthDb : DbContext — DbSet<User>, DbSet<Session>; seeded with 2 users
```

`provideAuth` — the host wiring seam (also where real/mock is decided):

```ts
export function provideAuth(): (EnvironmentProviders | Provider)[] {
  return [
    { provide: AUTH_API, useFactory: () =>
        inject(APP_CONFIG).authEnabled ? inject(AuthApiService) : inject(AuthApiMockService) },
    provideHttpClient(withInterceptors([unauthorizedInterceptor])),
    { provide: APP_INITIALIZER, useFactory: restoreSession, multi: true },
  ];
}
```

`proxy.conf.json` (order matters — specific route first):

```json
{
  "/api/auth": { "target": "http://localhost:5001", "secure": false },
  "/api":      { "target": "http://localhost:3000", "secure": false, "ws": true }
}
```

## Environment (verified 2026-07-22)

- **.NET 10 SDK installed and verified** (10.0.110; the net10.0 service and
  its test project build clean).
  ⚠ The remote container is ephemeral — a fresh session reinstalls with:
  `apt-get install -y dotnet-sdk-10.0` (packages.microsoft.com feed for
  Ubuntu 24.04, works through the proxy; `dot.net` script is blocked).
- NuGet (api.nuget.org) reachable.
- `npm install` needed once before client work.
- No docker daemon here — the Dockerfile ships review-only.

---

## Slice 0 — Plumbing: two services behind one proxy

Goal: the skeleton .NET service exists, runs, and the browser reaches it
through the Angular dev proxy. Nothing about auth yet — this de-risks all
tooling in one small step.

### Task 0.1: Scaffold auth-service (S)
**Description:** `dotnet new` solution + minimal API project (net6.0 —
retargeted to net10.0 later, in R1.1) + xUnit
test project, `appsettings.json` with port 5001, one endpoint:
`GET /api/auth/health` → `{ "status": "ok" }`. One xUnit test hits it via
`WebApplicationFactory` (in-memory test host).
**Acceptance:**
- [ ] `dotnet run` serves the health endpoint on :5001
- [ ] `dotnet test auth-service` passes
**Files:** `auth-service/` (new folder — sln, csproj ×2, Program.cs, appsettings.json, 1 test)
**Dependencies:** none

### Task 0.2: Wire the proxy and npm scripts (XS)
**Description:** `proxy.conf.json` route as above; `package.json`:
`auth-service` script. `npm install` for the client.
**Acceptance:**
- [ ] Browser `localhost:4200/api/auth/health` returns ok through the proxy
- [ ] Existing experiments page still loads its data (Node route untouched)
**Files:** `proxy.conf.json`, `package.json`
**Dependencies:** 0.1

### ✅ Checkpoint 0 (review): open the health URL through the proxy; existing app unaffected.

---

## Slice 1 — Login happy path

Goal: a seeded user logs in from a real login page and lands in the app.

### Task 1.1: Backend — users, sessions, login endpoint (M)
**Description:** EF Core 6 (bumped to 10 later, in R1.1) + SQLite: `Users` (2 seeded, PBKDF2-hashed
passwords) and `Sessions` tables. `POST /api/auth/login` as sketched above.
`401 invalid_credentials`, `400 invalid_request`. CORS with credentials
enabled. Sid via `RandomNumberGenerator.GetBytes(32)` → base64url.
**Acceptance:**
- [ ] xUnit: login ok / wrong password / malformed each return contract-exact responses
- [ ] Cookie is HttpOnly; session row lands in SQLite
**Files:** `auth-service/src/AuthService/` (Data/, Sessions/, Program.cs, appsettings.json), tests
**Dependencies:** 0.1

### Task 1.2: Frontend — contract, api service, session store (S)
**Description:** `auth-contract.ts`, `auth-api.service.ts`
(`withCredentials: true` on every call), `session.store.ts` — all as
sketched in Key Interfaces.
**Acceptance:**
- [ ] Jasmine: store sets user on login success, stays null on failure
- [ ] Api service request shape matches the contract (HttpClientTestingModule)
**Files:** `features/auth/auth-contract.ts`, `auth-api.service.ts`, `session.store.ts` + 2 specs
**Dependencies:** none (contract fixed by the spec — parallel with 1.1)

### Task 1.3: Frontend — login page + route (M)
**Description:** standalone `login-page.component` (reactive form: username,
password, Mode toggle, Position toggle — Material `mat-button-toggle-group`),
`provideAuth()` minimal (real service only for now), `/login` via
`loadComponent`, redirect to `returnUrl ?? /system-experiments` on success.
**Acceptance:**
- [ ] Jasmine: required-field validation; submit calls store.login with form values
- [ ] Manual: real login from the browser lands in the app
**Files:** `features/auth/login-page/` (3), `auth.providers.ts`, `app-routing.module.ts`, `app.module.ts`
**Dependencies:** 1.2 (+1.1 for the manual check)

### ✅ Checkpoint 1 (review): live login — seeded user + toggles → app. Wrong password → error visible in network tab (UI message comes in slice 4).

---

## Slice 2 — The door actually locks

Goal: guarded routes bounce to `/login`; a page reload keeps the session.

### Task 2.1: Backend — GET /api/auth/session (S)
**Description:** read `sid` cookie → look up row → not found/expired → `401`;
else `200` with the contract body (same shape as login).
**Acceptance:**
- [ ] xUnit: valid sid → 200 contract body; no/invalid sid → 401
**Files:** `auth-service` (Program.cs, Sessions/), tests
**Dependencies:** 1.1

### Task 2.2: Frontend — guard + session restore (S)
**Description:** `authGuard` (as sketched) on the feature routes; startup
restore in `provideAuth` (APP_INITIALIZER → `GET /session` → fill store);
`returnUrl` preserved through the redirect.
**Acceptance:**
- [ ] Jasmine: guard blocks when store empty, passes when filled
- [ ] Manual: deep-link logged out → login page; reload logged in → still in
**Files:** `auth.guard.ts` + spec, `auth.providers.ts`, `app-routing.module.ts`
**Dependencies:** 2.1, 1.3

### ✅ Checkpoint 2 (review): deep-link bounce + reload persistence, live.

---

## Slice 3 — Leaving: logout, expiry, 401 handling

Goal: the session ends properly — by choice, by time, or by the server.

### Task 3.1: Backend — logout + configurable TTL (S)
**Description:** `POST /api/auth/logout` (delete row, clear cookie,
idempotent 204). `SessionTtlHours` from appsettings/env drives `ExpiresAt`
and the expiry check.
**Acceptance:**
- [ ] xUnit: logout → next /session is 401; TTL config changes expiresAt; expired session → 401
**Files:** `auth-service` (Program.cs, Sessions/, appsettings.json), tests
**Dependencies:** 2.1

### Task 3.2: Frontend — logout UI + 401 interceptor (S)
**Description:** `unauthorizedInterceptor` (as in the data flow; registered
in `provideAuth`); small logout affordance showing the logged-in user/mode
(minimal placement in the shell — the one allowed shared-file touch).
**Acceptance:**
- [ ] Jasmine: 401 from any call empties the store and navigates
- [ ] Manual: logout → login page → guarded routes blocked again
**Files:** `unauthorized.interceptor.ts` + spec, `auth.providers.ts`, shell component (minimal)
**Dependencies:** 3.1, 2.2

### ✅ Checkpoint 3 (review): full cycle live — login → work → logout. TTL set to ~2 minutes → expiry bounces to login.

---

## Slice 4 — Honest error states

Goal: every failure the contract defines has a face.

### Task 4.1: Backend — contract hardening (XS)
**Description:** consistent error bodies (`invalid_request` details), correct
status codes verified for every path; seed passwords documented as fake.
**Acceptance:**
- [ ] xUnit contract round-trip suite green (this suite = executable contract doc)
**Files:** `auth-service` (small touches), tests
**Dependencies:** 3.1

### Task 4.2: Frontend — error UX on the login page (S)
**Description:** inline messages: wrong credentials, reserved `locked`
(distinct message), network/server unreachable; submit disabled while
pending; loading state.
**Acceptance:**
- [ ] Jasmine: each error type renders its message; double-submit prevented
- [ ] Manual: stop the auth service → friendly "cannot reach server" message
**Files:** `login-page/` (3), spec
**Dependencies:** 1.3

### ✅ Checkpoint 4 (review): wrong password, locked (simulated via devtools), server down — all visibly handled.

---

## Slice R1 — Requirement changes (2026-07-22): .NET 10, forever sessions, real lockout

Inserted after slice 4 (all of 0–4 merged); runs BEFORE the original slices
5–6. Spec source: "Requirement Changes — R1" section in spec.md. R2 items
(ubkey, two-system access point) are NOT here — they await their interview.

### Task R1.1: Retarget the service to .NET 10 (S)
**Description:** `net10.0` in both csproj files, EF Core packages to the
10.x line, test packages bumped only if the retarget forces it. No code
changes expected (the code deliberately used nothing version-specific).
Delete the local `auth.db` so it reseeds. (.NET 10 SDK 10.0.110 is
installed and verified in this environment; NETSDK1138 warnings disappear.)
**Acceptance:**
- [ ] `dotnet build` clean on net10.0, no EOL warnings
- [ ] All existing xUnit tests green unchanged (29)
**Files:** `auth-service/src/AuthService/AuthService.csproj`, `tests/.../AuthService.Tests.csproj`
**Dependencies:** none

### Task R1.2: Sessions never expire until explicit logout (M)
**Description:** `SessionTtlHours` becomes optional — unset/null (new
default) = no expiry: `Session.ExpiresAt` nullable, `FindLive` treats null
as live, cookie gets a long fixed Max-Age (~10 years) so it survives
browser restarts; a configured number restores today's timed behavior.
Contract change (spec already updated): `expiresAt` nullable in login and
session responses. Client: `UserSession.expiresAt: string | null` in
auth-contract.ts; store/specs adjusted (nothing renders it today).
**Acceptance:**
- [ ] xUnit: default config → expiresAt null, long-Max-Age cookie, /session lives past any old TTL boundary (clock-manipulated row)
- [ ] xUnit: `SessionTtlHours: 2` → exactly today's timed behavior (existing tests keep passing under this config)
- [ ] Jasmine: contract type updated; suite green
**Files:** `auth-service` (Session.cs, SessionService.cs, Program.cs, appsettings.json), tests; `auth-contract.ts` + affected specs
**Dependencies:** R1.1

### Task R1.4: Login retry limit — 423 becomes real (M)
**Description:** consecutive-failure tracking per submitted username (real
or not — so 423-vs-401 can't probe which usernames exist), stored in the
DB (survives service restart): after `MaxLoginAttempts` (default 5)
consecutive failures → `423 {"error":"locked"}` for `LockoutMinutes`
(default 15) → auto-unlock; a successful login resets the counter; locked
answers don't extend the lock. Both knobs in appsettings.json. The login
page already renders the locked message (slice 4) — verify live, no client
code expected.
**Acceptance:**
- [ ] xUnit: 5 fails → 423; 4 fails + success → counter reset; locked + correct password → still 423 during the window; unlock after window; unknown username follows the same 423 path; per-username isolation
- [ ] Manual: 5 wrong passwords in the browser → locked message appears
**Files:** `auth-service` (Data/, Sessions/, Program.cs, appsettings.json), tests
**Dependencies:** R1.1 (parallel with R1.2)

### ✅ Checkpoint R1 (review): net10 build; **delete `auth-service/src/AuthService/auth.db*` first** — R1 changed the schema and `EnsureCreated` never updates an existing file, so a pre-R1 database makes the service refuse to start (see the Commands section of the spec); then: login → close browser → reopen → still in; 5 wrong passwords → locked → wait/shorten window → unlocked; logout still ends everything; parallel logins (right or wrong password) never answer 500.

---

## Slice 5 — Auth-free mode (runtime switch)

Goal: same production build, config file flips auth off for dev environments.

### Task 5.1: Frontend — runtime config + mock (M)
**Description:** `assets/app-config.json`; `app-config.ts` loader
(APP_INITIALIZER before auth restore); `auth-api.mock.service.ts` (instant
fixed `operation`/`active` session); `provideAuth` factory picks real vs
mock (see Key Interfaces); missing/broken file → auth ON.
**Acceptance:**
- [ ] Jasmine: mock mode → guard passes, zero HTTP; config missing → real mode
- [ ] Manual: `ng build` once; flip the json in `dist/` by hand → app opens with no login, auth service stopped
**Files:** `assets/app-config.json`, `app-config.ts`, `auth-api.mock.service.ts` + spec, `auth.providers.ts`
**Dependencies:** 2.2

### ✅ Checkpoint 5 (review): the production-build flip, live — this is the 12-environments story working.

---

## Slice 6 — Extraction proof + docs

Goal: the two promises ("plug-out") are demonstrated, not claimed.

### Task 6.1: Extraction checks (S)
**Description:** script/manual proof: `features/auth/` has zero imports from
outside itself (grep-able check); `auth-service/` copied to a temp dir builds
and its tests pass standalone. Write the Dockerfile (base image
`mcr.microsoft.com/dotnet/aspnet:10.0`; review-only here — no docker daemon).
**Acceptance:**
- [ ] Both checks pass and are recorded in the spec folder
**Files:** `auth-service/Dockerfile`, small check script
**Dependencies:** all previous

### Task 6.2: Docs (S)
**Description:** `auth-service/README.md` (run, config, contract pointer,
migration notes: SQLite → real DB = EF provider swap; framework retarget =
three lines, as demonstrated by the net6.0 → net10.0 move in R1.1) and a
short `features/auth/README.md` (how a host app adopts:
`provideAuth`, routes, config). Update spec status to "implemented".
**Acceptance:**
- [ ] A new reader can run both sides from the READMEs alone
**Files:** 2 READMEs, spec.md status line
**Dependencies:** 6.1

### ✅ Checkpoint 6 (final review): success criteria 1–9 from the spec walked through, one by one, live.

---

## Parallelization

Within each slice the backend task and frontend task are independent (the
contract is fixed by the spec) — they can run in parallel and meet at the
checkpoint. Slices themselves are sequential.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ephemeral container loses the .NET SDK between sessions | Med | One-line reinstall documented above; consider a SessionStart hook later |
| ~~.NET 6 is EOL (no patches)~~ | Resolved | R1.1 retargeted the service to .NET 10 (current LTS) — the upgrade path was indeed three lines |
| First `dotnet restore` slow/flaky through proxy | Low | NuGet verified reachable; few dependencies (EF Core 10, SQLite) |
| Cookie flags on plain HTTP dev (`Secure` would break it) | Med | Dev: `HttpOnly; SameSite=Lax`, no `Secure`; README notes production behind TLS adds `Secure` |
| Karma/Chromium in remote env | Low | Chromium pre-installed (`CHROME_BIN`); verify at checkpoint 1 |
| Disk allowance (SDKs + node_modules + NuGet) | Med | Clean `dist/`/temp copies after extraction check |
| Dockerfile unverifiable here | Low | Ships review-only, stated in README |

## Open Questions

None blocking. PM items (intent doc §3) and repo convention remain open and
don't affect this plan.
