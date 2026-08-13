# angular-13-playground

An Angular playground app. It runs in front of two backend services: a Node
experiments service that lives here in `server/`, and a .NET auth service that
lives in its own repo.

## Running it

You need three things running for the full app. Each one is its own terminal.

```bash
npm install            # once

npm start              # the Angular app on http://localhost:4200
npm run server:start   # the Node experiments service on :3000
```

**The auth service is not in this repo.** It lives at
[github.com/izhaq/net-auth](https://github.com/izhaq/net-auth). Clone it
separately and run it on **:5001** (its default):

```bash
# in the net-auth clone
dotnet run --project src/AuthService
```

The dev proxy (`proxy.conf.json`) expects it there: it forwards `/api/auth` to
`http://localhost:5001` and everything else under `/api` to the Node service on
`http://localhost:3000`. If the auth service is not running, the login page
reports that it cannot reach the server.

`npm run auth-service` used to start it from this repo. It now just prints
where the service went and fails, so nobody is left wondering why :5001 is
silent.

## Other scripts

```bash
npm test               # client unit tests (Karma/Jasmine)
npm run build          # production build
npm run watch          # development build, rebuilt on change
npm run server:build   # compile the Node service
npm run server:prod    # run the compiled Node service
```

## Where the docs are

- `specs/` — specs and implementation plans. `specs/3-login-auth/spec.md` is
  the authoritative API contract between this client and the auth service, and
  it stays here even though the service moved.
- `docs/intent/` — why decisions were made.
- `docs/learning/` — walkthroughs written to explain the code.
</content>
