# Login & Authentication — Intent and Open Questions

**Status:** Confirmed by engineering (2026-07-11). Updated 2026-07-12: the .NET backend
is now built by us too (see §2b). Awaiting product review.
**For:** Product Manager — please review the decisions and answer the open questions.
**Context:** First work on authentication. Prototyped in the Angular playground. The
backend is a C#/.NET auth microservice built alongside the client, against the same
language-neutral API contract.

---

## 1. What We're Building

- **Outcome:** A self-contained login module — login form (username/password + mode
  toggle + position toggle), session handling, route protection, logout — plus a
  language-neutral API contract and a **.NET auth microservice** implementing it
  (added 2026-07-12; see §2b).
- **Why now:** The real project needs auth, nothing exists yet, and these decisions set
  the path for both client and server.
- **Success:** Works end-to-end in the playground and can be lifted into the real app
  with minimal rewiring — swap the backend URL, keep the contract.
- **Environment:** Closed network. No internet, no Active Directory, no SSO. Two user
  types (Operation, Technician), two stations (Active, Passive).
- **Out of scope:** Password change/reset, lockout, user-management screens, server
  rules like "only one Active station." The two accounts are seeded, not managed in UI.

---

## 2. Questions Asked and Answers Given

**Q1. Where will this module end up?**
In a real project that has no auth backend yet. This work is the reference design for
both sides. The real backend will be C#/.NET, so the API contract must not assume Node.

**Q2. What do the toggles mean?**
Active = the station in control, used by the Operation user. Passive = a monitoring,
read-only station, used by the Technician. Only these two user types exist. Each station
could be either, but in practice there are 2 stations, one of each.

**Q3. Are the toggles part of authentication or just UI state?**
Decision — the middle path: the login request sends mode and position, and the server
stores them in the session, but enforces no rules yet. Costs two extra fields today. If
rules are needed later, only the server changes — the client and contract stay the same.

**Q4. How long do sessions last?**
Long-lived, up to 24 hours. The lifetime must be configurable.

**Q5. Is account management in scope?**
No. All of it is out of scope for now.

---

## 2b. Backend Addition (2026-07-12)

Scope grew: we now build the .NET side ourselves — an independent, easily pluggable
auth microservice, with a simulated database.

**Q6. Where does the .NET service live — this repo or its own repo?**
In this repo for now, as a fully self-contained `auth-service/` folder: its own
solution/config files, own port, own Dockerfile. Nothing outside the folder references
anything inside it; the only shared touch points are one dev-proxy route and one npm
convenience script. Moving it to its own repo later = moving the folder.
*Own-repo-per-microservice is the org convention to be verified (§3, question 12).*

> **Answered 2026-08-12: its own repo,
> [izhaq/net-auth](https://github.com/izhaq/net-auth).** The "later" arrived,
> and the prediction held — it was a folder move. Full history came along
> (`git subtree split`, 26 commits), 170/170 tests passed at the new root with
> zero code changes, and of the two shared touch points only the npm script
> needed anything (the dev-proxy route to :5001 is untouched). The API
> contract, `specs/3-login-auth/spec.md`, deliberately stays in this repo.

**Q7. What happens to the Node server?**
It stays, as the "experiments data" service. This gives the playground the same shape
as production: two services in different languages on different ports, behind one
reverse proxy — a realistic microservices simulation.

**Q8. How do we simulate the database, and how hard is the later migration?**
The service talks to the database only through EF Core (the standard .NET data layer).
The simulated DB is a SQLite file — a real database in a single file, nothing to
install. Migrating later to the real project's DB is a provider + connection-string
change, not a redesign. The real project has a DB; which engine is unknown (§3,
question 11). The schema is tiny: two seeded users and a session table.

---

## 2c. Requirement Changes (2026-07-22)

Five changes arrived after the login flow was built (slices 0–4 merged).

**Accepted and in progress (R1):**
1. **.NET 10** — the org moved; the service retargets (three-line change, as
   designed). The old ".NET 6 is end-of-life" concern is gone.
2. **Sessions never expire** — only explicit logout ends a session. Decision:
   the login also survives a browser restart (a station reboot must not log
   the station out). This change validates the session-cookie choice — with
   JWT, a forever-valid token that logout can't kill would be unacceptable.
3. **Login retry limit** — the reserved "locked" answer becomes real.
   Working defaults, product may tune: 5 consecutive failures locks the
   username for 15 minutes, then auto-unlocks; success resets the counter.

**Decision taken 2026-08-11 — lockout denial-of-service risk: accepted.**
Anyone who can reach the login page can keep both station accounts locked
(5 tries per 15 minutes, by default). We accept this **because there is now a
way out**: an operator at the station can release a lock immediately, either
with a command on the service or through a local-only unlock endpoint — no
login needed, no waiting. Worth revisiting if the login page ever becomes
reachable from a wider network (the shared two-system portal below would do
that), or if it actually bites someone in practice. PM should confirm.

**Deferred pending clarification (R2):**
4. **"ubkey" station identification** — identify operator/technician from a
   hardware key and adjust the login options. Blocked on: what device is it
   exactly, and does it identify (pre-select) or authenticate (replace the
   password)?
5. **Login as the access point of two systems** (this system + the WIP
   maintenance system) — architecture-shaping; will get its own interview
   and spec. Leading candidate: a small standalone login app both systems
   share (the session cookie + independent auth service already support
   this).

---

## 3. Open Questions for Product

Deferred for now, but each gets more expensive to change later:

1. **Mode permissions.** Can a user be allowed Operation but denied Technician? Today
   the server stores the mode but doesn't check it.
2. **Single Active station.** Must the system block a second Active login? If yes —
   reject it, or take over and kick the first?
3. **Read-only for Passive.** Enforced by the server (commands rejected) or only by the
   client (controls hidden)? Client-only is not a security boundary.
4. **Account model.** Shared role accounts ("operator", "technician") or personal
   accounts? Shared accounts mean you can't tell who did what.
5. **Session expiry mid-shift.** When the session expires on a live station: warning
   countdown, re-login prompt, or lock? A silent logout is probably unacceptable.
6. **Switching mode/position.** Allowed after login, or does it require re-login?
   Current assumption: re-login.
7. **Lockout.** Out of scope to build, but does site policy require it? If yes, we
   should reserve a `locked` response in the contract now — cheap to do.
8. **Audit logging.** Should logins, logouts, and failed attempts be recorded?
9. **Password policy.** Any rules on strength, rotation, or who sets the seeded
   passwords?

Added 2026-07-12 (mostly for the engineering/infra side rather than product):

10. **How do other microservices check the session?** The experiments service doesn't
    own the session table — the auth service does. Real systems solve this at the
    gateway/reverse proxy or with service-to-service checks. Left open; the experiments
    service stays unprotected in this build.
11. **Which database does the real project use?** (SQL Server? Postgres?) And should
    auth data eventually merge into it, or should the auth service keep its own DB?
12. **Repo convention.** Does the org require each microservice in its own repo with
    its own CI/CD? To be checked; the folder design keeps both options open.

---

## 4. Decisions Made (all open to product override)

| # | Decision | Why |
|---|----------|-----|
| 1 | Login sends username, password, mode, position | Future-proof at near-zero cost |
| 2 | Server stores mode + position, enforces nothing | Enforcement rules not decided yet (§3) |
| 3 | Local user store, no external identity provider | Closed network |
| 4 | Sessions up to 24h, lifetime configurable | Control stations stay logged in all shift |
| 5 | Language-neutral contract; both sides implement it | Contract is the source of truth |
| 6 | Account management out of scope | Accounts are seeded |
| 7 | .NET auth microservice, self-contained `auth-service/` folder in this repo | Independent and pluggable; own-repo question deferred (§3.12). **Superseded 2026-08-12: extracted to [izhaq/net-auth](https://github.com/izhaq/net-auth)** — see §2b Q6 |
| 8 | Node server stays as the experiments-data service | Realistic two-microservice simulation behind one proxy |
| 9 | Simulated DB = SQLite via EF Core | Real DB later is a provider swap, not a redesign |
