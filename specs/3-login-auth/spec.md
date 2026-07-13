# Spec: Login & Authentication Module

**Status:** Draft — waiting for approval.
**Intent source:** `docs/intent/login-authentication.md` (confirmed 2026-07-11,
backend scope added 2026-07-12).

## Objective

Build the authentication slice of the system, both sides:

- **Client:** a self-contained login feature — login page (username/password +
  Mode toggle + Position toggle), session handling, route protection, logout.
- **Backend:** an independent .NET auth microservice (`auth-service/`),
  self-contained and pluggable, with a simulated database.
- **Between them:** a language-neutral API contract — the source of truth both
  sides implement.

Both pieces are designed for extraction into the real project.

**Users:**
- The two station users: Operation (Active station, in control) and
  Technician (Passive station, read-only monitoring).
- Downstream: the team lifting both pieces into the real system.

**Constraints (from the intent doc):**
- Closed network. No internet, no Active Directory, no SSO.
- Two seeded accounts; no account management.
- Sessions up to 24h; lifetime must be configurable.
- Mode and Position are sent at login and saved in the session. The server
  does not enforce rules on them yet ("middle path").

## Tech Stack

- **Client:** Angular 16.2 — the auth feature uses the modern APIs:
  **standalone components** (no NgModules), **signals** for session state,
  functional guard/interceptor, `inject()`. The rest of the app stays
  NgModule-based; mixing is officially supported and standard. Angular
  Material, Reactive Forms.
- **Auth service:** .NET 8 / ASP.NET Core minimal API, EF Core with SQLite
  (single-file DB, nothing to install). Own port (5001), own config, own
  Dockerfile.
- **Experiments service:** the existing Node/Express server (`server/`,
  port 3000) stays as-is — it plays the "other microservice" in the
  simulation.
- **Tests:** Karma + Jasmine on the client; xUnit on the auth service.

## The Two-Service Picture

The playground mirrors the production shape — separate pods, same DNS,
different ports, one proxy in front:

```
Browser → one address (dev: localhost:4200)
  /api/auth/...  →  auth-service (.NET, :5001)
  /api/...       →  experiments service (Node, :3000)
```

In dev the Angular proxy plays the reverse-proxy role; in production, nginx
or an ingress does (see "cookies and addresses" below).

**What auth does NOT impose on other services:** nothing. The experiments
service (and any future microservice) doesn't know the auth service exists.
Only the UI entrance is protected. If one day services themselves must
reject unauthenticated calls, the gateway pattern does it at the proxy for
all services at once — recorded as intent doc open question #10, out of
scope here.

## Auth Mechanism — Options and Decision

The shared idea: HTTP has no memory — every request arrives alone. So at
login the server hands the client a "proof of login", and the client shows
it on every request. The options differ in **what the proof is** and **where
it is kept**.

### Option A — Session cookie (chosen)

- **The proof:** a random id (e.g. `sid=a83kx9...`). Meaningless by itself —
  it is a key into a table the server keeps: *"session a83kx9 = user
  operation, mode operation, position active, expires 08:00"*.
- **Where kept:** in a cookie marked `HttpOnly`. The browser stores it and
  attaches it to every request by itself. `HttpOnly` means JavaScript cannot
  read it — an injected script (XSS) cannot steal the session.
- **Id generation:** a cryptographic random generator
  (`RandomNumberGenerator` in .NET). 256 random bits: collisions are
  practically impossible, and an attacker cannot guess a valid id. Never
  sequential ids like `session-1`.
- **Flow:** login → server creates a table row, returns user info +
  `Set-Cookie`. Later requests → browser attaches the cookie, server looks
  the id up. Page reload → app state is wiped but the cookie survives; the
  app calls `GET /api/auth/session` and is logged in again. Logout → server
  deletes the row and clears the cookie; the old id is instantly worthless.
  Expired → server returns `401`, client goes to the login page.
- **Downside:** the server must remember sessions ("stateful"). Irrelevant
  for us — one auth service, closed network.

### Option B — JWT (signed token)

- **The proof:** a token with the user info *inside it*, signed with a secret
  only the server knows. The server stores nothing; it just checks the
  signature on each request.
- **Where kept:** client JavaScript stores it (memory or localStorage) and
  attaches it by hand to every request (`Authorization: Bearer ...` header,
  via an HTTP interceptor).
- **Problems for us:** to survive a page reload the token must sit in
  localStorage — which JavaScript *can* read, so an injected script can steal
  it. And logout only deletes the client's copy; the token itself stays valid
  until it expires. The server has no table to delete it from.
- **Upside:** no server state — valuable when many services must check logins
  independently. Not our case today.

### Option C — JWT inside an HttpOnly cookie

The mix: fixes the stealing problem (JS can't read the cookie), keeps the
statelessness. But logout still cannot kill a token early, and with 24-hour
sessions that is a long life for a token nobody can revoke. Fixing that
needs a server-side block list — which is a session table again, so you've
built both and gained nothing.

### Why Option A wins

| Question | A: Session cookie | B: JWT + header | C: JWT in cookie |
|---|---|---|---|
| Can injected JS steal the proof? | No | Yes | No |
| Does logout really kill the session? | Yes | No | No |
| Client code that touches the proof | None | Interceptor + storage | None |
| Server must remember sessions | Yes | No | No |
| ASP.NET support | Built-in cookie auth | More setup | Unusual |

JWT's prize is statelessness, worth nothing here: one auth service, two
users. Session cookies give real logout, nothing stealable, less client
code, and ASP.NET cookie authentication is built in.

### Future enforcement (recorded, not built now)

Two likely rules — pending product decisions (intent doc §3.1–3.2) — need
the server to know who is logged in *right now*. Option A's session table
gives that for free; JWT cannot do either without rebuilding a session table.

- **Single login per user type:** at login, check the table — "is a session
  for this user type already live?" One lookup, server-only change.
- **Crash take-over:** a crashed station leaves a "ghost" session (no logout
  was called). The next login of that user type deletes the ghost and starts
  fresh. If the crashed station comes back, its cookie points at a deleted
  row → `401` → login page. Clean recovery. (Rejecting the new login instead
  would lock the user out for up to 24h — unacceptable for a control
  station.)

Both are later server-only changes. The client and contract stay untouched.

### Note: cookies and addresses (real deployment: same DNS, different ports)

In the real environments the client and the services run as separate docker
pods on the same physical machine — **same DNS name, different ports**
(e.g. app at `station:8080`, API at `station:5000`).

To the browser, a different port means a **different origin**, so our API
calls count as cross-origin. Two facts follow:

- The cookie itself is fine: cookies belong to the DNS name and ignore the
  port, and the `SameSite` protection also ignores the port. Nothing to fix
  there.
- But the browser will not *attach* cookies to cross-origin calls unless
  both sides opt in: the client sends HTTP calls with
  `withCredentials: true`, and the server answers with
  `Access-Control-Allow-Origin: <the app's exact address>` (not `*`) and
  `Access-Control-Allow-Credentials: true`.

Two clean ways to handle it — decide with the infra team:

1. **Reverse proxy (recommended):** the web server that serves the Angular
   files also forwards `/api/...` to the service pods. The browser sees one
   origin; no CORS, no `withCredentials`. This is exactly what our dev proxy
   does, so dev and production behave the same.
2. **CORS:** the two switches above. Works, but the allowed origin must be
   configured per environment, and every new consumer needs a CORS entry.

The client supports both: `withCredentials: true` is harmless on same-origin
calls, so we set it once and it works either way. The auth service enables
the matching CORS headers so the cross-origin path is testable too.

### Note: why not client-only auth (no server)

Putting the credentials in a client env file and a "logged in" flag in
localStorage is not security: everything in the client bundle is readable in
DevTools (the password would be public), and anyone can set the flag by hand
and walk past the guard. Client checks control what the UI *shows*; only a
server controls what a user *may do*. For running without a backend, use
the auth-free mode below instead.

## API Contract (language-neutral)

The source of truth — both the Angular client and the .NET service implement
it. JSON over HTTP under `/api/auth`.

**POST `/api/auth/login`**
```json
{ "username": "string", "password": "string", "mode": "operation" | "technician", "position": "active" | "passive" }
```
- `200` → `{ "user": { "username": "...", "mode": "...", "position": "..." }, "expiresAt": "ISO-8601" }` + `Set-Cookie: sid=...; HttpOnly`
- `401` → `{ "error": "invalid_credentials" }`
- `423` → `{ "error": "locked" }` — **reserved**. Not returned yet, but the
  client handles it, so lockout can be added later without a contract change.
- `400` → `{ "error": "invalid_request" }` — missing or malformed fields.

**POST `/api/auth/logout`** → `204`, deletes the session. Idempotent.

**GET `/api/auth/session`** → same `200` body as login (used on app startup /
page reload), or `401` if no valid session.

**Session rules:**
- Lifetime from service config (`SessionTtlHours` in `appsettings.json`,
  overridable by environment variable, default 24).
- Expiry counts from login; activity does not extend it.
- Any `401` from any API call means "session gone" → an HTTP interceptor
  clears the session store and redirects to the login page. No auto-refresh.

## Auth-Free Mode (dev/integration environments)

Reality: ~10 dev environments + 2 integration environments, each on its own
physical server, and **all get the same production build** (`ng build
--configuration production`). So the on/off switch cannot live in the build —
it must be read at **runtime**:

- One small config file per server, e.g. `assets/app-config.json`:
  `{ "authEnabled": true | false }`. Same build everywhere; each environment
  just carries its own copy of this file.
- The app loads it at startup (`APP_INITIALIZER`) before anything else runs.
- **Auth on:** real `AuthApiService` (HTTP) is plugged in → login page,
  cookie, service — the full flow.
- **Auth off:** a mock service is plugged in instead. It instantly fills the
  session store with a fixed user (`operation` / `active`). The guard finds
  a session and lets everything through — the login page is never seen, no
  service call, no cookie. The auth service doesn't even need to run.

This works because nothing in the app reads the cookie — the whole app reads
only the **session store**. Swapping what fills the store swaps the world.

Safety rules:
- Config file missing or unreadable → behave as `authEnabled: true`. The
  safe state is the default state.
- Real/station environments must never receive a config with auth off — an
  environment-provisioning concern, noted here so it isn't forgotten.

## Database (simulated now, real later)

- The service touches data **only through EF Core** (the standard .NET data
  layer). No raw SQL, no direct file access.
- Simulated DB: **SQLite** — a real database in a single local file, zero
  installation. Two tables: `Users` (two seeded rows, hashed passwords) and
  `Sessions` (id, username, mode, position, expiry).
- Migration to the real project's DB (engine unknown yet — intent doc §3.11)
  is a provider + connection-string change, not a redesign. If the org
  prefers the auth service keeping its own DB forever, the SQLite file
  simply *is* that DB until someone decides otherwise.

## Project Structure

Two self-contained units, mirroring each other's extraction story: the
feature folder on the client, the service folder on the backend.

```
src/app/features/auth/            → extractable client unit, flat — 8 files + the
                                    component's template/styles. Imports only
                                    Angular/RxJS and its own files.
  auth-contract.ts                → ALL types in one place: HTTP request/response
                                    shapes, UserSession, Mode, Position, and the
                                    AUTH_API_CONFIG injection token
  auth-api.service.ts             → real HTTP implementation (no state)
  auth-api.mock.service.ts        → auth-free mode: instant fixed session, no HTTP
  session.store.ts                → signal-based session state:
                                    user = signal<UserSession | null>,
                                    isLoggedIn = computed(...)
  auth.guard.ts                   → functional guard: reads the store via inject()
  unauthorized.interceptor.ts     → functional interceptor: 401 → clear store → /login
  auth.providers.ts               → provideAuth(config): one call that wires the
                                    api service (real vs mock), interceptor, and
                                    config into the host app
  login-page/
    login-page.component.ts       → standalone component (the form + 2 toggles)
    login-page.component.html
    login-page.component.scss

src/assets/app-config.json        → runtime config ({ "authEnabled": ... }, per environment)
src/app/app-config.ts             → startup loader (APP_INITIALIZER), feeds provideAuth

auth-service/                     → extractable backend unit (.NET, port 5001).
                                    Nothing outside references anything inside.
  AuthService.sln
  src/AuthService/
    Program.cs                    → minimal API: the three endpoints, CORS, cookie
    appsettings.json              → port, SessionTtlHours, connection string
    Data/                         → EF Core context, entities, seed (two users)
    Sessions/                     → session create/lookup/delete logic
  tests/AuthService.Tests/        → xUnit: contract round-trip tests
  Dockerfile

server/                           → Node experiments service — unchanged, port 3000
```

What the modern APIs deleted: `auth.module.ts` and the whole
`pages/login/` wrapper module are gone — a standalone component lazy-loads
straight from the route (`loadComponent`), and `provideAuth(...)` replaces
module wiring. Two modules fewer, five files fewer, same behavior.

Shared touch points (the complete list):
- `proxy.conf.json`: `/api/auth` → `:5001`; existing `/api` → `:3000` stays.
- `package.json`: one convenience script to run the auth service.
- `app-routing.module.ts`: `{ path: 'login', loadComponent: ... }` +
  `auth.guard` on feature routes.
- `app.module.ts`: `provideAuth(...)` in the root providers.

## Commands

```
npm start                  → ng serve (proxy: /api/auth → :5001, /api → :3000)
npm run server:start       → experiments service (Node) on :3000
npm run auth-service       → auth service (.NET) on :5001  [requires .NET 8 SDK]
npm test                   → client unit tests (Karma/Jasmine)
dotnet test auth-service   → auth service tests (xUnit)
npm run build              → production build (same artifact for all environments)
```

## Code Style

Client — modern Angular 16 style inside the feature: `inject()` instead of
constructor injection, signals for state, config through an injection token:

```ts
/** Session state. The only thing the rest of the app reads. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(AUTH_API);

  private readonly _user = signal<UserSession | null>(null);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  // components read: store.isLoggedIn(), store.user()?.mode ...
}
```

Conventions: single quotes, trailing commas, `*.spec.ts` next to the code,
all shared types in `auth-contract.ts`, no `any`. Templates read signals
directly (`store.user()?.username`) — no `async` pipe needed for session
state.

Auth service — idiomatic modern .NET: minimal API, dependency injection,
`record` types for request/response, async throughout, no static state.

## Testing Strategy

**Client (Karma/Jasmine, specs next to the code), priorities:**

1. **`session.store`** — login success/failure, logout, restore on startup,
   expiry (`401` → logged-out state).
2. **`auth.guard`** — blocks and redirects with no session; passes with one.
3. **`login-page` component** — required fields, toggle defaults, error
   messages for `invalid_credentials` / `locked` / network error.
4. **`auth-api.service`** — requests match the contract
   (HttpClientTestingModule).
5. **Auth-free mode** — with the mock plugged in, the guard passes and no
   HTTP is made; with config missing, auth stays ON.

**Auth service (xUnit):** contract round-trip against the real endpoints
(in-memory test host + SQLite in-memory): login ok / wrong password →
session returns the user → logout → session returns 401 → expired session
returns 401. These tests double as the contract's executable documentation.

## Boundaries

- **Always:**
  - Keep `features/auth/` and `auth-service/` free of references from/to
    the rest of the repo — extraction is a success criterion.
  - Keep the HTTP contract language-neutral. A contract change updates
    `auth-contract.ts`, the .NET service, and this spec together.
  - Hash the seeded passwords (this code will be copied as an example —
    make it a correct one).
  - Run the tests before each commit.
- **Ask first:**
  - Adding any dependency (npm or NuGet).
  - Changing the auth mechanism (cookie ↔ JWT).
  - Touching shared app files beyond the three listed touch points.
  - Any server-side enforcement of mode/position rules (out of scope by
    decision).
- **Never:**
  - Store credentials or session ids in localStorage/sessionStorage.
  - Commit real credentials; dev passwords must be obviously fake.
  - Build account management UI, password reset, or lockout behavior.
  - Default to auth-off when the runtime config is missing or broken.
  - Protect the experiments service (out of scope — intent doc §3.10).

## Success Criteria

1. Both services + app running, logged out: any guarded route redirects to
   `/login`.
2. Login with a seeded user + toggles lands in the app; user, mode, position,
   expiry are available via the session store; experiments data still loads
   from the Node service.
3. Page reload keeps the session (via `GET /api/auth/session`).
4. Logout returns to `/login`; guarded routes are blocked again.
5. Wrong credentials show an inline error; the reserved `locked` error shows
   its own message.
6. Session lifetime changes via `appsettings.json` alone; an expired session
   bounces to `/login` on the next API call.
7. **Auth-free check:** the same production build, with `authEnabled: false`
   in `app-config.json`, opens the app with no login page and no auth HTTP
   calls. With the file missing, auth is ON.
8. **Extraction checks:** `features/auth/` compiles with zero imports from
   outside its folder; `auth-service/` builds and its tests pass with the
   folder copied out of the repo.
9. All tests pass: `npm test` and `dotnet test`.

## Open Questions

1. ~~Option A (session cookie)~~ — **approved 2026-07-12.**
2. ~~Real project's Angular version~~ — **answered 2026-07-12: Angular 16,
   possibly 18 by adoption time.** Standalone + signals are exactly what
   17/18 favor, so the upgrade path is smooth; any refactoring would be
   optional modernization, not rework.
3. **Org's .NET version — answered: org is on .NET 6.** Decision: build on
   **.NET 8**, written 6-compatible by discipline (no 7/8-only features).
   Reasoning: (a) compatibility flows our way — a net8.0 *app* can reference
   the org's net6.0 common library and Rabbit wrapper; the forbidden
   direction (net8 library inside net6 app) doesn't apply to a standalone
   service nobody references; (b) .NET 6 is end-of-life since Nov 2024 — a
   brand-new auth service shouldn't start life on an unpatched runtime;
   (c) if org policy still forces 6 at adoption, the retarget is three
   lines (`TargetFramework`, EF Core package major, Docker base image).
   One infra check remains: org build servers must have a .NET 8 SDK (or
   build via docker).
4. **Real project's DB engine** (intent doc §3.11) — doesn't block the build,
   thanks to the EF Core seam.
5. **Repo convention** (intent doc §3.12) — own repo per microservice? The
   folder design keeps both options open.
6. **Product questions** — intent doc §3 stays with the PM; none block this
   build.
