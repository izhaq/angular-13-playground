# Login & Authentication — Intent, Decisions, and Open Questions

**Status:** Intent confirmed by engineering (2026-07-11). Awaiting product review.
**Audience:** Product Manager — please review the decisions below and answer the open questions.
**Context:** This is the first work on authentication for the real system. It is being
prototyped in the Angular playground repo, with a simple Node reference backend. The real
backend will be C#/.NET and will implement the same API contract.

---

## 1. Confirmed Intent

- **Outcome:** A self-contained login/auth feature module — login form (username/password +
  Operation/Technician mode toggle + Active/Passive position toggle), session handling,
  route protection, logout — plus a simple Node reference backend and a language-agnostic
  API contract.
- **User:** The engineer building auth first; downstream, the .NET team implementing the
  contract for the real backend.
- **Why now:** The real project needs authentication, nothing exists yet, and these
  decisions set the path for both client and server.
- **Success:** The module works end-to-end in the playground and can be lifted into the
  real Angular app with minimal rewiring — swap the backend URL, keep the contract.
- **Constraint:** Closed network, no internet, no external identity provider. Two user
  identities (Operation, Technician), two stations (Active, Passive). Sessions up to 24h,
  lifetime configurable.
- **Out of scope (for now):** Password change/reset, account lockout, user-management UI,
  server-side rules such as "only one Active station." The two accounts are seeded, not
  managed through UI.

---

## 2. The Interview — Questions, Assumptions, and Answers

Each entry shows the question asked, the assumption (guess) engineering made, and the
answer given. Answers marked **DECIDED** are working decisions the PM can still override.

### Q1. "Easy to extract" — extract to where?

- **Assumption:** The playground is a staging ground; the login module will be lifted into
  an existing real Angular app that already has an auth backend.
- **Answer:** Partly right. The module IS destined for a real project — but that project
  has **no auth backend yet**. This work is the reference design for both sides. The real
  backend will be **C#/.NET**, so the API contract must be language-agnostic. A simple
  reference implementation will be built on this project's Node server.
- **Status:** DECIDED.

### Q2. What do the Mode and Position toggles actually do?

- **Assumption:** They are part of the auth contract, not just UI state. Mode
  (Operation/Technician) determines permission level; Position (Active/Passive) reflects
  redundant-workstation semantics — Active is in control, Passive is monitoring.
- **Answer:** Engineering's read on Position was confirmed: **Active = the station in
  control, used by the Operation user; Passive = a monitoring, read-only station, used by
  the Technician.** The system has only these two user types in total (not 10 operators
  and 20 technicians). In theory each station can be either Active/Operation or
  Passive/Monitoring; in practice there will be **2 stations, one of each**.
- **Status:** DECIDED (semantics). See open questions §3 for enforcement.

### Q3. How much do the toggles impact the design right now?

- **Assessment given:** On the login screen — almost zero. On the API contract — medium.
  On the backend — potentially large (e.g., enforcing "only one Active station" means
  session coordination on the server).
- **Decision — the "middle path":** The toggles ARE sent in the login request and stored
  in the session by the server, but **no server-side rules are enforced yet**. This costs
  two extra fields today and keeps the door open: if enforcement is needed later, only the
  server adds a check — the client and the API contract do not change.
- **Status:** DECIDED.

### Q4. What is the deployment environment?

- **Assumption:** Closed/isolated network (control-room LAN), no internet, no corporate
  identity provider (no Active Directory / LDAP / SSO). Long-lived sessions — a station
  logs in at the start of a shift and stays in; aggressive token expiry would be wrong.
- **Answer:** Confirmed — closed network, no internet, no external identity provider.
  One refinement: sessions are **long-lived up to 24 hours**, and the lifetime **must be
  configurable**.
- **Status:** DECIDED.

### Q5. Is account management in scope?

- **Assumption:** All out of scope — the two accounts are seeded by the system, not
  managed through UI. In scope is only the complete login/logout cycle: login page,
  toggles, session handling, route protection, API contract.
- **Answer:** Confirmed — **all account management is out of scope** (password
  change/reset, lockout, admin screens).
- **Status:** DECIDED.

---

## 3. Open Questions for Product

These came up during the interview but were deferred. They do not block the current work,
but each one becomes more expensive to change later. Product input is requested.

1. **Mode permissions.** Should Technician mode require a different permission than
   Operation — i.e., can a user be allowed one mode but denied the other? Today the
   contract carries the mode but the server does not check it.
2. **Single Active station.** Must the system enforce "only one Active station at a
   time"? If yes: what happens when a second station tries to log in as Active — reject,
   or take over and kick the first? (The current design can add this server-side without
   changing the client.)
3. **Read-only enforcement for Passive.** Passive is described as read-only. Is
   read-only enforced by the server (rejecting commands from a Passive session) or only
   by the client (hiding the controls)? Client-only is not a security boundary.
4. **Account model.** Are the two identities *role accounts* (a shared "operator" login
   and a shared "technician" login) or *personal accounts* per person? This affects
   traceability — with shared accounts you cannot tell who did what.
5. **Session expiry mid-shift.** When the 24h (configurable) session expires while a
   station is live, what should happen — silent re-login, a warning countdown, or an
   immediate lock? Logging out a live control station silently is probably unacceptable.
6. **Switching mode/position.** Can a station change Mode or Position after login
   without logging out and back in? Current assumption: no — re-login is required.
7. **Failed-login lockout.** Lockout is out of scope for the build, but do regulations
   or site policy require it in the real system? If yes, the contract should reserve a
   `locked` response status now (cheap) even if the behavior comes later.
8. **Audit logging.** Should logins, logouts, and failed attempts be recorded for audit?
   Common requirement in operational environments.
9. **Password policy.** Any requirements on password strength, rotation, or who sets the
   seeded passwords?

---

## 4. Decisions Already Made (summary for quick review)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Login sends username, password, mode, position | "Middle path" — forward-compatible with future enforcement at near-zero cost today |
| 2 | Server stores mode + position in the session, enforces nothing | Enforcement rules are a product decision not yet made (see §3) |
| 3 | Local user store, no external identity provider | Closed network — AD/LDAP/SSO not available |
| 4 | Long-lived session, up to 24h, configurable lifetime | Control-station usage pattern; short expiry would log out a live station |
| 5 | Language-agnostic API contract + Node reference backend | Real backend will be C#/.NET; contract must not assume Node |
| 6 | Account management fully out of scope | Accounts are seeded; management flows deferred |
