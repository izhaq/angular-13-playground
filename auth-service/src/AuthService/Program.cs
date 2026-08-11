using System.Text.Json;
using AuthService.Admin;
using AuthService.Data;
using AuthService.Sessions;
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
// environments take the single path the middleware below shapes.
builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteHandlerOptions>(
    options => options.ThrowOnBadRequest = true);

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

// CORS with credentials: needed for the real deployment's cross-origin path
// (same DNS, different ports — see spec "cookies and addresses"). The origin
// must be exact (never '*') for the browser to attach cookies.
const string CorsPolicy = "AllowClient";
var allowedOrigin = builder.Configuration["AllowedOrigin"] ?? "http://localhost:4200";
builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
    policy.WithOrigins(allowedOrigin).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

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

// Contract hardening, part 2: requests that die BEFORE an endpoint runs —
// malformed JSON syntax, wrong field types, a null/empty body, a non-JSON
// content type — must still answer the contract's 400 body, exactly like
// field-level validation does (spec: 400 → {"error":"invalid_request"},
// "missing or malformed fields"). In .NET 6 minimal APIs there are no
// endpoint filters (7+) or IExceptionHandler (8+), so a small middleware is
// the idiomatic central place: with ThrowOnBadRequest pinned on above, every
// binding failure funnels through this one catch.
//
// A non-JSON content type would natively be a 415; the contract enumerates
// only 400/401/423 and calls 400 "missing or malformed" — a body that is not
// JSON at all is the extreme case of malformed, and adding 415 would be a
// contract change (spec: contract changes update spec + client + server
// together). So every early failure maps to the one contract-defined 400.
app.Use(async (context, next) =>
{
    try
    {
        await next(context);

        // Not every early rejection throws: a non-JSON content type is
        // short-circuited by the framework as an empty-bodied 415 even with
        // ThrowOnBadRequest on. An empty body (HasStarted false) on a 400/415
        // can only be a framework rejection — endpoint-authored 400s always
        // carry the contract body — so reshape it here.
        if (!context.Response.HasStarted &&
            context.Response.StatusCode is StatusCodes.Status400BadRequest
                or StatusCodes.Status415UnsupportedMediaType)
        {
            await WriteContractInvalidRequest(context);
        }
    }
    catch (Exception ex) when (ex is BadHttpRequestException or JsonException)
    {
        if (context.Response.HasStarted)
        {
            throw; // Too late to reshape the response — let the server abort it.
        }

        context.Response.Clear();
        await WriteContractInvalidRequest(context);
    }

    static Task WriteContractInvalidRequest(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return context.Response.WriteAsJsonAsync(new { error = "invalid_request" });
    }
});

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
    app.Use(async (context, next) =>
    {
        if (context.Request.Path.StartsWithSegments(UnlockEndpoint.PathPrefix) &&
            !adminListener.Accepts(context.Connection.LocalPort))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        await next(context);
    });

    app.MapPost(UnlockEndpoint.Route, UnlockEndpoint.Handle);
}

app.MapGet("/api/auth/health", () => Results.Json(new { status = "ok" }));

app.MapPost("/api/auth/login", async (
    LoginRequest request, AuthDb db, SessionService sessions, LockoutService lockout, HttpContext http) =>
{
    if (!request.IsValid())
    {
        // A malformed request never reaches the password check, so it is not
        // a failed attempt — otherwise anyone could lock an operator out with
        // pure garbage.
        return Results.Json(new { error = "invalid_request" }, statusCode: StatusCodes.Status400BadRequest);
    }

    // The lock is checked before any credential work (R1.4). Three things
    // follow, all of them wanted: a locked username is refused even with the
    // right password; attempts made while locked are not counted, so they
    // cannot extend the window; and the answer is identical for a real and an
    // invented username, so 423 tells a prober nothing.
    if (await lockout.IsLocked(request.Username!))
    {
        return Results.Json(new { error = "locked" }, statusCode: StatusCodes.Status423Locked);
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
            ? Results.Json(new { error = "locked" }, statusCode: StatusCodes.Status423Locked)
            : Results.Json(new { error = "invalid_credentials" }, statusCode: StatusCodes.Status401Unauthorized);
    }

    await lockout.Reset(request.Username!);

    var session = await sessions.Create(user.Username, request.Mode!, request.Position!);

    http.Response.Cookies.Append(SessionCookieName, session.Sid, SessionCookieOptions(sessions.CookieMaxAge));

    return Results.Ok(new
    {
        user = new { username = user.Username, mode = session.Mode, position = session.Position },
        expiresAt = session.ExpiresAt,
    });
});

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
});

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

    return Results.Ok(new
    {
        user = new { username = session.Username, mode = session.Mode, position = session.Position },
        expiresAt = session.ExpiresAt,
    });
});

app.Run();
return 0;

// Exposes the implicit Program class to the test host (WebApplicationFactory<Program>).
public partial class Program { }
