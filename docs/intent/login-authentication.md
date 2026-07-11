# Login & Authentication — Intent and Open Questions

**Status:** Confirmed by engineering (2026-07-11). Awaiting product review.
**For:** Product Manager — please review the decisions and answer the open questions.
**Context:** First work on authentication. Prototyped in the Angular playground with a
simple Node reference backend. The real backend will be C#/.NET and will implement the
same API contract.

---

## 1. What We're Building

- **Outcome:** A self-contained login module — login form (username/password + mode
  toggle + position toggle), session handling, route protection, logout — plus a
  language-agnostic API contract and a Node reference backend.
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

---

## 4. Decisions Made (all open to product override)

| # | Decision | Why |
|---|----------|-----|
| 1 | Login sends username, password, mode, position | Future-proof at near-zero cost |
| 2 | Server stores mode + position, enforces nothing | Enforcement rules not decided yet (§3) |
| 3 | Local user store, no external identity provider | Closed network |
| 4 | Sessions up to 24h, lifetime configurable | Control stations stay logged in all shift |
| 5 | Language-agnostic contract + Node reference backend | Real backend is C#/.NET |
| 6 | Account management out of scope | Accounts are seeded |
