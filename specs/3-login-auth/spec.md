# Spec: Login & Authentication Module

**Status:** Draft — waiting for approval.
**Intent source:** `docs/intent/login-authentication.md` (confirmed 2026-07-11).

## Objective

Build a self-contained login feature: a login page (username/password + Mode
toggle + Position toggle), session handling, route protection, and logout.
Along with it: a clear API contract and a simple reference backend on this
project's Express server.

This is the reference design for the real system. The real backend will be
C#/.NET, so the contract must work for any language — nothing Node-specific.

**Users:**
- The two station users: Operation (Active station, in control) and Technician
  (Passive station, read-only monitoring).
- Downstream: the .NET team, who will implement the API contract.

**Constraints (from the intent doc):**
- Closed network. No internet, no Active Directory, no SSO.
- Two seeded accounts; no account management.
- Sessions up to 24h; lifetime must be configurable.
- Mode and Position are sent at login and saved in the session. The server
  does not enforce any rules on them yet ("middle path").

## Tech Stack

- **Client:** Angular 16.2 (NgModules, lazy-loaded pages), RxJS 7.5,
  Angular Material 16, Reactive Forms.
- **Reference server:** Express 4 (TypeScript, in `server/`), in-memory data.
- **Tests:** Karma + Jasmine (already set up), spec files next to the code.

## Auth Mechanism — Options and Decision

First, the shared idea: after login, the server must recognize the user on
every later request. HTTP itself has no memory — each request arrives alone.
So the server gives the client some "proof of login" at login time, and the
client shows that proof on every request. The options below differ only in
**what the proof is** and **where the client keeps it**.

### Option A — Session cookie (what we chose)

**The proof:** a random id (like `sid=a83kx92...`) that means nothing by
itself. The server keeps a table in memory/DB: "session a83kx92 = user
operation, mode operation, position active, expires at 08:00". The id is just
a key into that table.

**Where it's kept:** in a cookie marked `HttpOnly`. The browser stores it and
attaches it to every request automatically. `HttpOnly` means JavaScript cannot
read it — so even if someone injects a script into the page (XSS attack), the
script cannot steal the session.

**The full flow:**
1. User submits the form → client sends `POST /api/auth/login` with username,
   password, mode, position.
2. Server checks the password, creates a session record in its table, and
   answers with the user info + a `Set-Cookie: sid=...` header.
3. The browser saves the cookie on its own. Our Angular code never sees or
   touches it — it only saves the user info in the session store (app state).
4. Every later API call: the browser attaches the cookie automatically. The
   server looks the id up in its table → knows who you are.
5. Page reload: app state is wiped, but the cookie survives. On startup the
   app calls `GET /api/auth/session`; the server finds the session and returns
   the user info; the app is logged in again without asking for a password.
6. Logout: `POST /api/auth/logout` → server deletes the row from its table and
   clears the cookie. The old id is now worthless — a real logout.
7. Expiry: the server checks the timestamp in its table. Expired → `401` →
   client redirects to the login page.

**Downside:** the server must remember sessions (it is "stateful"). If you
run many servers, they must share the session table. Not our problem — we
have one server on a closed network.

### Option B — JWT (a signed token)

**The proof:** a JWT is a string with the user info *inside it* (username,
mode, expiry...), plus a signature made with a secret key only the server
knows. The server doesn't store anything — when a token comes back, it checks
the signature. Valid signature = "I wrote this, and nobody changed it."

**Where it's kept:** the client's JavaScript stores the token (usually in
memory or localStorage) and adds it by hand to every request as a header:
`Authorization: Bearer <token>`.

**The full flow:**
1. Same login request as Option A.
2. Server checks the password, builds the token, signs it, sends it in the
   response body. It stores nothing.
3. Our Angular code must keep the token and attach the header to every API
   call (an HTTP interceptor does this).
4. Every later call: server verifies the signature and reads the user info
   straight from the token. No table lookup.
5. Page reload: memory is wiped, so the token must be in localStorage to
   survive — and localStorage **is** readable by JavaScript, so an injected
   script can steal it. This is the classic JWT weakness.
6. Logout: the client just deletes its copy. But the token itself is still
   valid until it expires — the server has no table to delete it from. A
   stolen token keeps working. (Fixing this needs a server-side "block list"
   — which is a session table again, so you lose the whole benefit.)
7. Expiry: the expiry time is written inside the token; the server rejects
   old tokens.

**Upside:** the server is "stateless" — great when many separate services
must all check logins without sharing a database.

### Option C — JWT inside an HttpOnly cookie (the mix)

Put a JWT in an HttpOnly cookie instead of a session id. You get the cookie's
safety (JS can't steal it) and the server stays stateless. But logout still
can't kill a token before it expires, and with our 24-hour sessions that's a
long life for a token nobody can revoke.

### Why Option A wins for us

| Question | A: Session cookie | B: JWT + header | C: JWT in cookie |
|---|---|---|---|
| Can injected JS steal the proof? | No (HttpOnly) | Yes (localStorage) | No (HttpOnly) |
| Does logout really kill the session? | Yes — row deleted | No — valid until expiry | No — valid until expiry |
| Angular code that touches the proof | None | Interceptor + storage | None |
| Server must remember sessions | Yes | No | No |
| Fits ASP.NET later | Yes — built-in cookie auth | Yes, more setup | Possible, unusual |

Statelessness is JWT's big prize, and it's worth nothing to us: one server,
closed network, two users. Meanwhile session cookies give us real logout,
no stealable token, less client code, and the .NET team gets ASP.NET's
built-in cookie authentication. Easy call — but it needs your yes
(see Open Questions #1).

### Future enforcement (noted, not built now)

Two likely future rules — both pending product decisions (intent doc §3.1,
§3.2) — depend on the server knowing who is logged in right now. The session
table from Option A gives us that for free; pure JWT cannot do either without
rebuilding a session table on the side.

- **Single login per user type.** At login, the server checks its session
  table: "is there already a live session for this user type?" One lookup,
  server-only change. The client and the contract stay as they are.
- **Crash take-over.** A crashed station leaves a "ghost" session (nobody
  called logout). When the next login of that user type arrives, the server
  deletes the old session and creates a fresh one. The ghost id is now dead —
  if the crashed station comes back, its cookie hits a deleted row, gets a
  `401`, and lands back on the login page. Clean recovery, no lockout.
  (The alternative — rejecting the new login — would lock the user out until
  the old session expires, up to 24h. Unacceptable for a control station.)

Neither rule is implemented in this build. The point recorded here: Option A
makes both a small server-only change later; the other options don't.

## API Contract (language-agnostic)

The contract is the main deliverable for the backend team. JSON over HTTP,
under `/api/auth`.

**POST `/api/auth/login`**
```json
{ "username": "string", "password": "string", "mode": "operation" | "technician", "position": "active" | "passive" }
```
- `200` → `{ "user": { "username": "...", "mode": "...", "position": "..." }, "expiresAt": "ISO-8601" }` + `Set-Cookie: sid=...; HttpOnly`
- `401` → `{ "error": "invalid_credentials" }`
- `423` → `{ "error": "locked" }` — **reserved**. Our reference server never
  returns it, but the client already handles it, so the real backend can add
  account lockout later without changing the contract.
- `400` → `{ "error": "invalid_request" }` — missing or malformed fields.

**POST `/api/auth/logout`** → `204`, deletes the session. Idempotent: returns
`204` even if there was no session.

**GET `/api/auth/session`** → `200` with the same body as login (used when the
app starts or the page reloads), or `401` if there is no valid session.

**Session rules:**
- Lifetime set by server config (`SESSION_TTL_HOURS`, default 24).
- Expiry is counted from login time; activity does not extend it.
- Any `401` from any API call means "session gone" → client redirects to the
  login page. No auto-refresh.

## Project Structure

Follows the `system-experiments` pattern: the feature folder is the unit you
extract; a thin page module wires it into this app and stays behind.

```
src/app/features/auth/            → THE extractable unit. Imports only Angular/RxJS
                                    and its own files — nothing else from app/.
  auth.module.ts                  → declares/exports the login page component
  api/
    auth-contract.ts              → request/response types (mirrors the HTTP contract)
    auth-tokens.ts                → AUTH_API_CONFIG injection token (endpoint URLs)
    auth-api.service.ts           → HttpClient calls, no state
  session/
    session.store.ts              → session state (BehaviorSubject), login/logout/restore
    session.models.ts             → UserSession, Mode, Position types
  guards/
    auth.guard.ts                 → functional guard: no session → go to /login
  components/login-page/          → the form (username, password, 2 toggles)

src/app/pages/login/              → host wiring (stays behind on extraction):
  login-page.module.ts            → lazy route, provides AUTH_API_CONFIG + redirect target

server/src/auth/                  → reference backend
  routes.ts                       → the three endpoints
  users.ts                        → two seeded users (hashed passwords)
  sessions.ts                     → in-memory session table with expiry
  config.ts                       → SESSION_TTL_HOURS (env var, default 24)
```

Routing changes in `app-routing.module.ts`: add a lazy `/login` route; put
`auth.guard` on the existing feature routes.

## Commands

```
npm start              → ng serve (proxies /api → localhost:3000)
npm run server:start   → reference backend on :3000
npm test               → Karma/Jasmine unit tests
npm run build          → production build
```

## Code Style

Match the existing feature pattern — config comes in through an injection
token, `readonly` constructor injection, thin services:

```ts
/** POST /api/auth endpoints. URLs come from `AUTH_API_CONFIG`. */
@Injectable()
export class AuthApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(AUTH_API_CONFIG) private readonly config: AuthApiConfig,
  ) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.config.loginUrl, payload);
  }
}
```

Conventions: single quotes, trailing commas, `*.spec.ts` next to the code,
types in dedicated `*-contract.ts` / `*.models.ts` files, no `any`.

## Testing Strategy

Karma/Jasmine, specs next to the code. What to test, in priority order:

1. **`session.store`** — login success/failure, logout, restore on startup,
   expiry (`401` → logged-out state).
2. **`auth.guard`** — blocks and redirects with no session; passes with one.
3. **`login-page` component** — required-field validation, toggle defaults,
   error messages for `invalid_credentials` / `locked` / network error.
4. **`auth-api.service`** — requests match the contract
   (HttpClientTestingModule).

The server gets one cheap smoke test (login → session → logout round trip).
It's a throwaway reference — the contract is what matters.

## Boundaries

- **Always:**
  - Keep `features/auth/` free of imports from outside itself — extraction is
    a success criterion, not a style choice.
  - Keep the HTTP contract language-neutral. Any contract change updates
    `auth-contract.ts`, the server, and this spec together.
  - Hash the seeded passwords even here (this file will be copied as an
    example — make it a correct example).
  - Run `npm test` before each commit.
- **Ask first:**
  - Adding any dependency.
  - Changing the auth mechanism (cookie ↔ JWT).
  - Touching shared app files beyond the routing wire-up.
  - Any server-side enforcement of mode/position rules (out of scope by
    decision).
- **Never:**
  - Store credentials or session ids in localStorage/sessionStorage.
  - Commit real credentials; dev passwords must be obviously fake.
  - Build account management UI, password reset, or lockout behavior.

## Success Criteria

1. `npm run server:start` + `npm start`: opening any guarded route while
   logged out redirects to `/login`.
2. Logging in with a seeded user + chosen toggles lands in the app; the
   session (user, mode, position, expiry) is available via the session store.
3. Page reload keeps the session (restored via `GET /api/auth/session`).
4. Logout returns to `/login`; guarded routes are blocked again.
5. Wrong credentials show an inline error; the reserved `locked` error shows
   its own distinct message.
6. Session lifetime changes via config alone; an expired session bounces to
   `/login` on the next API call.
7. Extraction check: `features/auth/` compiles with zero imports from outside
   its own folder (Angular/RxJS packages excepted).
8. All new unit tests pass via `npm test`.

## Open Questions

1. **Option A (session cookie) — yes or no?** The comparison above is the
   case for it. Worth a quick sanity check with whoever owns the .NET side.
2. **Product questions** — the 9 items in `docs/intent/login-authentication.md`
   §3 stay with the PM; none of them block this build.
