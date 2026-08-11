using System.Net;
using System.Threading.RateLimiting;
using AuthService.Admin;
using AuthService.Data;
using AuthService.Http;
using AuthService.Sessions;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

// The operator commands run BEFORE any host is built (R1.5b). They must work
// with the service stopped, they have no business opening an HTTP listener,
// and the web host's command-line configuration provider would reject a bare
// argument like "unlock" outright.
if (UnlockCommand.Matches(args))
{
    return await UnlockCommand.Run(args, Console.Out, Console.Error);
}

var builder = WebApplication.CreateBuilder(args);

// Contract hardening, part 1: make every model-binding failure THROW
// (BadHttpRequestException) instead of the framework's silent empty-bodied
// 400/415. By default this flag is on only in Development — without pinning
// it, production would answer contract-breaking empty bodies while the test
// host (which runs as Development) answers exceptions. Pinning it makes all
// environments take the single path ContractExceptionHandler shapes.
builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteHandlerOptions>(
    options => options.ThrowOnBadRequest = true);

// Contract hardening, part 2: those exceptions become the contract's
// 400 {"error":"invalid_request"} (R1.6b, replacing a hand-written try/catch
// middleware).
//
// AddProblemDetails is not decoration: UseExceptionHandler() refuses to build
// with neither an ExceptionHandlingPath nor an inline handler, and an
// IExceptionHandler alone does not satisfy it — registering ProblemDetails is
// the documented way to say "the handlers decide". It only ever shapes what
// ContractExceptionHandler declines, which is by definition a genuine fault:
// those stay 500s instead of being dressed up as the client's mistake.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ContractExceptionHandler>();

// SQLite file pinned to the service folder regardless of the process CWD
// (npm run auth-service starts from the repo root). The unlock command
// resolves it through the same helper, so both open the same file.
builder.Services.AddDbContext<AuthDb>(options => options.UseSqlite(
    AuthDbConnection.Resolve(builder.Configuration, builder.Environment.ContentRootPath)));
builder.Services.AddScoped<SessionService>();

// Every time-dependent rule in the service (session expiry, the lockout
// window) reads this clock rather than DateTimeOffset.UtcNow (R1.6a).
// Production is the real one; tests substitute a clock they can move, which is
// what let the suites stop ageing rows in the database to reach an expiry.
builder.Services.AddSingleton(TimeProvider.System);

// The lockout policy is parsed ONCE, here, and shared as a singleton — not
// re-read from IConfiguration on every login. Invalid values throw before the
// host starts, so a config the service cannot honour as written is a startup
// failure naming the key, never a silent reinterpretation (R1.5a).
builder.Services.AddSingleton(LockoutOptions.FromConfiguration(builder.Configuration));
builder.Services.AddScoped<LockoutService>();

// The login rate limit, parsed by the same rules and at the same moment as the
// lockout policy above (R1.6b). Off unless configured, and an invalid value is
// a startup failure naming the key rather than a limiter that means something
// other than what the config file says.
var loginRateLimit = LoginRateLimitOptions.FromConfiguration(builder.Configuration);
if (loginRateLimit.IsOn)
{
    builder.Services.AddRateLimiter(limiter =>
    {
        limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        // Partitioned by the CONNECTION's peer address — genuinely one budget
        // per peer, and read from the socket, so nothing a caller sends can
        // change which partition it lands in.
        //
        // Note what that IS NOT, because the deployment the spec recommends
        // takes it away: behind a reverse proxy on the same host, every
        // request has the SAME peer (the proxy), so all logins share one
        // partition and this becomes a single global login budget. One noisy
        // caller then does spend the station's own budget — an outsider can
        // exhaust the window and keep the operator from logging in without
        // knowing any username at all, which is cheaper than the lockout
        // denial of service the spec already records under "Known accepted
        // risk". Directly exposed, or behind a proxy that does not share the
        // machine, the per-peer reading holds.
        //
        // Trusting X-Forwarded-For instead would restore per-caller partitions
        // ONLY together with UseForwardedHeaders configured with KnownProxies.
        // Without that pairing the header is attacker-controlled, and a
        // limiter an attacker can partition themselves out of is worse than
        // none — so neither is wired here.
        //
        // Connections with no remote address (the in-memory test host, a unix
        // socket) share one partition rather than each getting a free one.
        limiter.AddPolicy(LoginRateLimitOptions.PolicyName, context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = loginRateLimit.PermitLimit!.Value,
                    Window = loginRateLimit.Window,

                    // Refuse immediately rather than holding the caller open:
                    // a queued login is a connection an attacker gets for free.
                    QueueLimit = 0,
                }));
    });
}

// CORS with credentials: needed for the real deployment's cross-origin path
// (same DNS, different ports — see spec "cookies and addresses"). The origin
// must be exact (never '*') for the browser to attach cookies.
const string CorsPolicy = "AllowClient";
var allowedOrigin = builder.Configuration["AllowedOrigin"] ?? "http://localhost:4200";
builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
    policy.WithOrigins(allowedOrigin).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// The generated API description (R1.6b), Development only: it is a
// documentation aid for the .NET team, not part of what a station serves.
// The spec's "API Contract" section stays authoritative — OpenApiDocumentTests
// checks the generated document against it so the two cannot drift silently.
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddOpenApi();
}

// The operator endpoints are off unless AdminUrls says otherwise (R1.5b).
// When it does, the service binds a SECOND Kestrel listener on loopback and
// the admin routes answer only there — see AdminListenerOptions for why that
// is a listener rather than a remote-IP check. Invalid values (a public
// address, the public API's own port) stop startup naming the key, exactly
// like the lockout knobs above.
var adminListener = AdminListenerOptions.FromConfiguration(builder.Configuration);
if (adminListener.IsOn)
{
    builder.WebHost.UseUrls([.. adminListener.ServerUrls]);

    // UseUrls is a REQUEST, not a guarantee: 'Kestrel:Endpoints' configuration
    // overrides it entirely and Kestrel says so in one log line before
    // carrying on. AdminListenerGuard checks the addresses the server actually
    // bound once it is up, and stops the service if the admin listener is
    // missing or is not on loopback — see AdminListenerOptions.
    builder.Services.AddHostedService(services =>
        new AdminListenerGuard(adminListener, services.GetRequiredService<IServer>()));
}

var app = builder.Build();

// Dev-grade schema management: EnsureCreated + seed. Real migrations come
// with the real database engine, behind the same EF seam.
//
// EnsureCreated stands down entirely when the database file already exists, so
// a file from an earlier slice keeps its old schema and every login 500s. The
// guard turns that into a startup failure naming the file to delete, because
// booting into a service that cannot log anyone in helps nobody.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDb>();
    db.Database.EnsureCreated();
    SchemaGuard.VerifyOrThrow(db);
    SeedData.EnsureSeeded(db);
}

app.UseCors(CorsPolicy);

// The framework-owned half: every binding failure raised as an exception
// becomes the contract's 400 (see ContractExceptionHandler). Registered here,
// INSIDE UseCors, so a reshaped 400 still carries its CORS headers — CORS
// re-applies them from an OnStarting callback, which survives the response
// being cleared.
app.UseExceptionHandler();

// …and the thin half that IExceptionHandler cannot cover. A non-JSON content
// type is not an exception: the framework short-circuits it as an empty-bodied
// 415 even with ThrowOnBadRequest pinned on, so nothing is ever thrown for the
// handler to see. The contract enumerates only 400/401/423 for login and calls
// 400 "missing or malformed" — a body that is not JSON at all is the extreme
// case of malformed, and answering 415 would be a contract change (spec:
// contract changes update spec + client + server together).
//
// An empty body (HasStarted false) on a 400/415 can only be a framework
// rejection, since endpoint-authored 400s always carry the contract body.
app.Use(async (context, next) =>
{
    await next(context);

    if (!context.Response.HasStarted &&
        context.Response.StatusCode is StatusCodes.Status400BadRequest
            or StatusCodes.Status415UnsupportedMediaType)
    {
        await ContractInvalidRequest.Write(context);
    }
});

// The per-IP login rate limit (R1.6b), off unless configured — see
// LoginRateLimitOptions. Nothing is registered and no partition is tracked
// when it is off, so "off" costs literally nothing. Placed after UseCors so a
// 429 reaches a cross-origin browser as a 429 rather than as status 0.
if (loginRateLimit.IsOn)
{
    app.UseRateLimiter();
}

// Single source of truth for the session cookie. Login's Append and logout's
// Delete must agree on the name and attributes — a browser only drops a cookie
// when the clearing Set-Cookie matches the one that set it — so both build
// their options here and cannot drift.
const string SessionCookieName = "sid";

static CookieOptions SessionCookieOptions(TimeSpan? maxAge = null) => new()
{
    HttpOnly = true,
    SameSite = SameSiteMode.Lax,
    Path = "/",
    MaxAge = maxAge,
    // No Secure flag: dev runs on plain HTTP. Production behind TLS adds it.
};

if (adminListener.IsOn)
{
    // The gate runs before the endpoint executes, so on the public port
    // /admin/* is not "there but refused" — it is not there at all: no body is
    // bound, no handler runs, and the answer is the same 404 an unmapped path
    // gets. Routing has already picked the endpoint by now; only UseEndpoints,
    // at the end of the pipeline, would run it.
    //
    // Two facts about the SOCKET have to hold, and both are about our end of
    // it — never about what the request says about itself, which is the
    // remote-IP check the spec forbids:
    //
    // - the connection was accepted on an admin port, and
    // - the address it was accepted ON is loopback.
    //
    // The second is not redundant. 'Kestrel:Endpoints' configuration overrides
    // UseUrls entirely, so the admin listener can silently never be created
    // while the public listener happens to hold the admin port on 0.0.0.0 —
    // and then the port check alone passes for a request that came off the
    // network. AdminListenerGuard refuses that configuration at startup; this
    // line means the endpoint is unreachable even in the moments before it
    // does, and under any future way of binding nobody has thought of. It only
    // ever narrows: a connection genuinely accepted by the loopback admin
    // listener satisfies both.
    app.Use(async (context, next) =>
    {
        if (context.Request.Path.StartsWithSegments(UnlockEndpoint.PathPrefix))
        {
            var localAddress = context.Connection.LocalIpAddress;
            var onAdminListener = localAddress is not null &&
                IPAddress.IsLoopback(localAddress) &&
                adminListener.Accepts(context.Connection.LocalPort);

            if (!onAdminListener)
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }
        }

        await next(context);
    });

    // ExcludeFromDescription: unlocking is an operator action outside the
    // client contract (spec, "Manual unlock"), so it never appears in the
    // published API description — a document that lists it invites a client to
    // call it.
    app.MapPost(UnlockEndpoint.Route, UnlockEndpoint.Handle).ExcludeFromDescription();
}

// A liveness probe, not a contract endpoint — nobody implements against it, so
// it stays out of the description too.
app.MapGet("/api/auth/health", () => Results.Json(new { status = "ok" })).ExcludeFromDescription();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

var login = app.MapPost("/api/auth/login", async (
    LoginRequest request, AuthDb db, SessionService sessions, LockoutService lockout, HttpContext http) =>
{
    if (!request.IsValid())
    {
        // A malformed request never reaches the password check, so it is not
        // a failed attempt — otherwise anyone could lock an operator out with
        // pure garbage.
        return Results.Json(new ErrorResponse("invalid_request"), statusCode: StatusCodes.Status400BadRequest);
    }

    // The lock is checked before any credential work (R1.4). Three things
    // follow, all of them wanted: a locked username is refused even with the
    // right password; attempts made while locked are not counted, so they
    // cannot extend the window; and the answer is identical for a real and an
    // invented username, so 423 tells a prober nothing.
    if (await lockout.IsLocked(request.Username!))
    {
        return Results.Json(new ErrorResponse("locked"), statusCode: StatusCodes.Status423Locked);
    }

    var user = await db.Users.SingleOrDefaultAsync(u => u.Username == request.Username);

    // Unknown user still verifies against a dummy hash: both failure paths
    // cost the same (no username probing) and return the same response.
    var verified = Pbkdf2.Verify(request.Password!, user?.PasswordHash ?? Pbkdf2.DummyHash);
    if (user is null || !verified)
    {
        // Counted against the SUBMITTED username, real or not.
        var nowLocked = await lockout.RecordFailure(request.Username!);
        return nowLocked
            ? Results.Json(new ErrorResponse("locked"), statusCode: StatusCodes.Status423Locked)
            : Results.Json(new ErrorResponse("invalid_credentials"), statusCode: StatusCodes.Status401Unauthorized);
    }

    await lockout.Reset(request.Username!);

    var session = await sessions.Create(user.Username, request.Mode!, request.Position!);

    http.Response.Cookies.Append(SessionCookieName, session.Sid, SessionCookieOptions(sessions.CookieMaxAge));

    return Results.Ok(new LoginResponse(
        new UserView(user.Username, session.Mode, session.Position), session.ExpiresAt));
})
// The contract's status codes, so the generated description says what the spec
// says. 429 is absent on purpose: the rate limiter is infrastructure and the
// spec is explicit that it is not added to the client contract.
.Produces<LoginResponse>(StatusCodes.Status200OK)
.Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
.Produces<ErrorResponse>(StatusCodes.Status401Unauthorized)
.Produces<ErrorResponse>(StatusCodes.Status423Locked);

// Rate limiting is attached HERE and nowhere else (R1.6b). /api/auth/session
// and /api/auth/logout are what a page reload calls — limiting them would log
// a station out for refreshing too eagerly — and /admin/unlock is unreachable
// off-box, so limiting it would only hinder the operator standing at it.
if (loginRateLimit.IsOn)
{
    login.RequireRateLimiting(LoginRateLimitOptions.PolicyName);
}

app.MapPost("/api/auth/logout", async (SessionService sessions, HttpContext http) =>
{
    // Idempotent by design: no cookie, unknown sid, and already-deleted all
    // end the same way — 204, nothing to reveal (spec: "deletes the session.
    // Idempotent.").
    if (http.Request.Cookies.TryGetValue(SessionCookieName, out var sid) && !string.IsNullOrEmpty(sid))
    {
        await sessions.Delete(sid);
    }

    // Clear the cookie with the same attributes it was set with.
    // (Delete emits an expired Set-Cookie.)
    http.Response.Cookies.Delete(SessionCookieName, SessionCookieOptions());

    return Results.NoContent();
})
.Produces(StatusCodes.Status204NoContent);

app.MapGet("/api/auth/session", async (SessionService sessions, HttpContext http) =>
{
    // Spec: 200 with the same body shape as login, "or 401 if no valid
    // session" — the spec defines no 401 body for /session, so none is sent.
    if (!http.Request.Cookies.TryGetValue(SessionCookieName, out var sid) || string.IsNullOrEmpty(sid))
    {
        return Results.Unauthorized();
    }

    var session = await sessions.FindLive(sid);
    if (session is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new LoginResponse(
        new UserView(session.Username, session.Mode, session.Position), session.ExpiresAt));
})
// The spec defines no body for /session's 401, so none is described either.
.Produces<LoginResponse>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status401Unauthorized);

app.Run();
return 0;

// Exposes the implicit Program class to the test host (WebApplicationFactory<Program>).
public partial class Program { }
