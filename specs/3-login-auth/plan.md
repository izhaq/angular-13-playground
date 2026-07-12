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
- .NET 8 minimal API in self-contained `auth-service/` (port 5001);
  EF Core + SQLite; Node server stays as the experiments service (port 3000).
- Client: standalone components + signals, flat `features/auth/` (8 files),
  `provideAuth()` as the wiring seam.
- Runtime `app-config.json` switches real/mock auth; missing file = auth ON.

## Environment (verified 2026-07-12)

- .NET 8 SDK **installed and working** in this session (8.0.422 via
  `apt-get install dotnet-sdk-8.0`; packages.microsoft.com is reachable).
  ⚠ The remote container is ephemeral — a fresh session must reinstall.
- NuGet (api.nuget.org) reachable through the proxy.
- `npm install` needed once before client work.
- No docker daemon here — the Dockerfile ships review-only.

---

## Slice 0 — Plumbing: two services behind one proxy

Goal: the skeleton .NET service exists, runs, and the browser reaches it
through the Angular dev proxy. Nothing about auth yet — this de-risks all
tooling in one small step.

### Task 0.1: Scaffold auth-service (S)
**Description:** `dotnet new` solution + minimal API project + xUnit test
project, `appsettings.json` with port 5001, one endpoint:
`GET /api/auth/health` → `{ "status": "ok" }`. One trivial xUnit test hits it
via the in-memory test host.
**Acceptance:**
- [ ] `dotnet run` serves the health endpoint on :5001
- [ ] `dotnet test auth-service` passes
**Files:** `auth-service/` (new folder — sln, csproj ×2, Program.cs, appsettings.json, 1 test)
**Dependencies:** none

### Task 0.2: Wire the proxy and npm scripts (XS)
**Description:** `proxy.conf.json`: `/api/auth` → `:5001` (before the
existing `/api` → `:3000` rule); `package.json`: `auth-service` script.
`npm install` for the client.
**Acceptance:**
- [ ] With all three running, browser `localhost:4200/api/auth/health` returns ok
- [ ] Existing experiments page still loads its data (Node route untouched)
**Files:** `proxy.conf.json`, `package.json`
**Dependencies:** 0.1

### ✅ Checkpoint 0 (review): open the health URL through the proxy; existing app unaffected.

---

## Slice 1 — Login happy path

Goal: a seeded user logs in from a real login page and lands in the app.

### Task 1.1: Backend — users, sessions, login endpoint (M)
**Description:** EF Core + SQLite: `Users` (2 seeded, hashed passwords) and
`Sessions` tables. `POST /api/auth/login`: validate → create session row →
`Set-Cookie: sid=...; HttpOnly` + contract body. `401 invalid_credentials`,
`400 invalid_request`. CORS with credentials enabled. Session id via
`RandomNumberGenerator`.
**Acceptance:**
- [ ] xUnit: login ok / wrong password / malformed each return contract-exact responses
- [ ] Cookie is HttpOnly; session row lands in SQLite
**Files:** `auth-service/src/AuthService/` (Data/, Sessions/, Program.cs, appsettings.json), tests
**Dependencies:** 0.1

### Task 1.2: Frontend — contract, api service, session store (S)
**Description:** `auth-contract.ts` (all types + `AUTH_API` token),
`auth-api.service.ts` (`withCredentials: true`), `session.store.ts`
(signals: `user`, `isLoggedIn`, `login()` calling the api and setting state).
**Acceptance:**
- [ ] Jasmine: store sets user on login success, stays null on failure
- [ ] Api service request shape matches the contract (HttpClientTestingModule)
**Files:** `features/auth/auth-contract.ts`, `auth-api.service.ts`, `session.store.ts` + 2 specs
**Dependencies:** none (contract is fixed by the spec — parallel with 1.1)

### Task 1.3: Frontend — login page + route (M)
**Description:** standalone `login-page.component` (reactive form: username,
password, Mode toggle, Position toggle — Material), `provideAuth()` minimal
(real service only for now), `/login` route via `loadComponent`, redirect to
`/system-experiments` on success.
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
**Description:** return the session's user + expiry from the cookie's sid, or
`401`. Expiry checked against the row.
**Acceptance:**
- [ ] xUnit: with valid sid → 200 contract body; no/invalid sid → 401
**Files:** `auth-service` (Program.cs, Sessions/), tests
**Dependencies:** 1.1

### Task 2.2: Frontend — guard + session restore (S)
**Description:** functional `auth.guard` on the feature routes; startup
restore in `provideAuth` (APP_INITIALIZER → `GET /session` → fill store);
guard redirects to `/login` with the attempted URL preserved.
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
idempotent 204). `SessionTtlHours` from appsettings/env drives `expiresAt`
and the expiry check.
**Acceptance:**
- [ ] xUnit: logout → next /session is 401; TTL config changes expiresAt; expired session → 401
**Files:** `auth-service` (Program.cs, Sessions/, appsettings.json), tests
**Dependencies:** 2.1

### Task 3.2: Frontend — logout UI + 401 interceptor (S)
**Description:** `unauthorized.interceptor` (401 → clear store → `/login`,
registered in `provideAuth`); small logout affordance showing the logged-in
user/mode (minimal placement in the shell — the one allowed shared-file touch).
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

## Slice 5 — Auth-free mode (runtime switch)

Goal: same production build, config file flips auth off for dev environments.

### Task 5.1: Frontend — runtime config + mock (M)
**Description:** `assets/app-config.json`; `app-config.ts` loader
(APP_INITIALIZER before auth restore); `auth-api.mock.service.ts` (instant
fixed session); `provideAuth` picks real vs mock from the loaded config;
missing/broken file → auth ON.
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
and its tests pass standalone. Write the Dockerfile (review-only here — no
docker daemon in this environment).
**Acceptance:**
- [ ] Both checks pass and are recorded in the spec folder
**Files:** `auth-service/Dockerfile`, small check script
**Dependencies:** all previous

### Task 6.2: Docs (S)
**Description:** `auth-service/README.md` (run, config, contract pointer,
migration note: SQLite → real DB = provider swap) and a short
`features/auth/README.md` (how a host app adopts: `provideAuth`, routes,
config). Update spec status to "implemented".
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
| Ephemeral container loses the .NET SDK between sessions | Med | Install command documented above; consider a SessionStart hook later |
| First `dotnet restore` slow/flaky through proxy | Low | NuGet verified reachable; few dependencies (EF Core, SQLite) |
| Cookie flags on plain HTTP dev (`Secure` would break it) | Med | Dev: `HttpOnly; SameSite=Lax`, no `Secure`; note in README that production behind TLS adds `Secure` |
| Karma/Chromium in remote env | Low | Chromium pre-installed (`CHROME_BIN`); verify at checkpoint 1 |
| Disk allowance (SDK + node_modules + NuGet) | Med | SDK already installed; clean `dist/`/temp copies after extraction check |
| Dockerfile unverifiable here | Low | Ships review-only, stated in README |

## Open Questions

None blocking. PM items (intent doc §3) and repo convention remain open and
don't affect this plan.
