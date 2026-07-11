# Spec: Login & Authentication Module

**Status:** Draft — awaiting engineering approval.
**Intent source:** `docs/intent/login-authentication.md` (confirmed 2026-07-11).

## Objective

Build a self-contained, extractable login/authentication feature: a login page
(username/password + Mode toggle + Position toggle), session handling, route
protection, and logout — plus a language-agnostic API contract and a reference
backend on this project's Express server.

This is the reference design for the real system. The real backend will be
C#/.NET and must be able to implement the same contract without change.

**Users:**
- The two station users: Operation (Active station, in control) and Technician
  (Passive station, monitoring/read-only).
- Downstream: the .NET team, who consume the API contract.

**Environment constraints (from intent doc):**
- Closed network. No internet, no Active Directory, no SSO, no OAuth.
- Two seeded accounts; no account management.
- Sessions up to 24h; lifetime configurable.
- Mode and Position are sent at login and stored in the session; the server
  enforces no rules on them yet ("middle path").

## Tech Stack

- **Client:** Angular 16.2 (NgModules, lazy-loaded page modules), RxJS 7.5,
  Angular Material 16, Reactive Forms.
- **Reference server:** Express 4 (TypeScript, `server/`), in-memory stores.
- **Tests:** Karma + Jasmine (existing setup), spec files colocated.

## API Contract (language-agnostic)

The contract is the primary deliverable for the backend team. JSON over HTTP,
under `/api/auth`. No Node-specific behavior.

### Auth mechanism — proposed (see Open Questions #1)

HttpOnly session cookie carrying an opaque session id; sessions live
server-side. Chosen because: no token handling in JS (XSS-safe), idiomatic in
ASP.NET (cookie auth middleware), and the closed network makes cross-origin
concerns moot. JWT is the alternative if the real system needs stateless
validation across services.

### Endpoints

**POST `/api/auth/login`**
```json
{ "username": "string", "password": "string", "mode": "operation" | "technician", "position": "active" | "passive" }
```
- `200` → `{ "user": { "username": "...", "mode": "...", "position": "..." }, "expiresAt": "ISO-8601" }` + `Set-Cookie: sid=...; HttpOnly`
- `401` → `{ "error": "invalid_credentials" }`
- `423` → `{ "error": "locked" }` — **reserved**, never returned by the
  reference server; exists so the client handles it and the real backend can
  add lockout later without a contract change.
- `400` → `{ "error": "invalid_request" }` — missing/malformed fields.

**POST `/api/auth/logout`** → `204`, clears the session (idempotent — `204`
even if no session).

**GET `/api/auth/session`** → `200` with the same body as login (used on app
bootstrap / page reload), or `401` if no valid session.

### Session rules

- Lifetime configurable via server config (`SESSION_TTL_HOURS`, default 24).
- Expiry is absolute from login (not sliding). Expired sessions return `401`.
- The client treats any `401` from any API call as "session gone" → redirect
  to login. No auto-refresh (see Open Questions in intent doc §3.5).

## Project Structure

Follows the `system-experiments` extractable-feature pattern: the feature
folder is the unit of extraction; a thin page module wires it into this app.

```
src/app/features/auth/            → THE extractable unit. Imports only Angular/RxJS
                                    and its own files — nothing from the rest of app/.
  auth.module.ts                  → declares/exports the login page component
  api/
    auth-contract.ts              → request/response types (mirror of the HTTP contract)
    auth-tokens.ts                → AUTH_API_CONFIG injection token (endpoint URLs)
    auth-api.service.ts           → HttpClient calls, no state
  session/
    session.store.ts              → session state (BehaviorSubject), login/logout/restore
    session.models.ts             → UserSession, Mode, Position types
  guards/
    auth.guard.ts                 → functional guard: no session → redirect to /login
  components/login-page/          → form component (username, password, 2 toggles)

src/app/pages/login/              → host wiring (stays behind on extraction):
  login-page.module.ts            → lazy route, provides AUTH_API_CONFIG + redirect target

server/src/auth/                  → reference backend
  routes.ts                       → the three endpoints
  users.ts                        → two seeded users (hashed passwords)
  sessions.ts                     → in-memory session store with TTL
  config.ts                       → SESSION_TTL_HOURS (env, default 24)
```

Route changes in `app-routing.module.ts`: add lazy `/login`; guard the
existing feature routes with `auth.guard`.

## Commands

```
npm start              → ng serve (proxies /api → localhost:3000)
npm run server:start   → reference backend on :3000
npm test               → Karma/Jasmine unit tests
npm run build          → production build
```

## Code Style

Match the existing feature pattern — config via injection token, `readonly`
constructor injection, thin services:

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

Conventions: single quotes, trailing commas, `*.spec.ts` colocated, types in
dedicated `*-contract.ts` / `*.models.ts` files, no `any`.

## Testing Strategy

Karma/Jasmine, colocated specs. Coverage focus (in priority order):

1. **`session.store`** — login success/failure, logout, restore-on-bootstrap,
   expiry handling (`401` → logged-out state).
2. **`auth.guard`** — blocks and redirects without session; passes with one.
3. **`login-page` component** — validation (required fields), toggle defaults,
   error rendering for `invalid_credentials` / `locked` / network error.
4. **`auth-api.service`** — request shapes match the contract
   (HttpClientTestingModule).

Server code gets a smoke-level check (login → session → logout round trip)
only if cheap; it's a throwaway reference, the contract is what matters.

## Boundaries

- **Always:**
  - Keep `features/auth/` free of imports from outside itself (extraction is
    a stated success criterion, not a style preference).
  - Keep the HTTP contract language-agnostic; any contract change updates
    `auth-contract.ts`, the server, and this spec together.
  - Hash the seeded passwords even in the reference server (the seed file
    will be copied as an example, so make it a correct example).
  - Run `npm test` before each commit.
- **Ask first:**
  - Adding any dependency.
  - Changing the auth mechanism (cookie ↔ JWT).
  - Touching shared app files beyond the routing wire-up.
  - Any server-side enforcement of mode/position rules (out of scope by
    decision).
- **Never:**
  - Store credentials or session ids in localStorage/sessionStorage.
  - Commit real credentials; seeded dev passwords must be obviously fake.
  - Build account management UI, password reset, or lockout behavior.

## Success Criteria

1. `npm run server:start` + `npm start`: opening any guarded route while
   logged out redirects to `/login`.
2. Logging in with a seeded user + chosen toggles lands on the app; the
   session (user, mode, position, expiry) is visible to the app via the
   session store.
3. Page reload keeps the session (restored via `GET /api/auth/session`).
4. Logout returns to `/login`; guarded routes are blocked again.
5. Wrong credentials show an inline error; the reserved `locked` error renders
   a distinct message.
6. Session TTL is changed by config alone; an expired session bounces to
   `/login` on the next API call.
7. Extraction check: `features/auth/` compiles with zero imports from outside
   its folder (other than Angular/RxJS packages).
8. All new unit tests pass via `npm test`.

## Open Questions

1. **Cookie vs JWT** — spec proposes HttpOnly cookie sessions. Needs a yes
   from you (and ideally a sanity check with whoever owns the .NET side).
2. **Product questions** — the 9 items in `docs/intent/login-authentication.md`
   §3 remain with the PM; none block this build.
