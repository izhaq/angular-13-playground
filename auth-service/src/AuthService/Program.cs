using System.Text.Json;
using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

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
// (npm run auth-service starts from the repo root).
var connectionString = builder.Configuration.GetConnectionString("AuthDb") ?? "Data Source=auth.db";
var connection = new SqliteConnectionStringBuilder(connectionString);
if (!Path.IsPathRooted(connection.DataSource))
{
    connection.DataSource = Path.Combine(builder.Environment.ContentRootPath, connection.DataSource);
}

builder.Services.AddDbContext<AuthDb>(options => options.UseSqlite(connection.ToString()));
builder.Services.AddScoped<SessionService>();

// CORS with credentials: needed for the real deployment's cross-origin path
// (same DNS, different ports — see spec "cookies and addresses"). The origin
// must be exact (never '*') for the browser to attach cookies.
const string CorsPolicy = "AllowClient";
var allowedOrigin = builder.Configuration["AllowedOrigin"] ?? "http://localhost:4200";
builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
    policy.WithOrigins(allowedOrigin).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

// Dev-grade schema management: EnsureCreated + seed. Real migrations come
// with the real database engine, behind the same EF seam.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDb>();
    db.Database.EnsureCreated();
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

app.MapGet("/api/auth/health", () => Results.Json(new { status = "ok" }));

app.MapPost("/api/auth/login", async (LoginRequest request, AuthDb db, SessionService sessions, HttpContext http) =>
{
    if (!request.IsValid())
    {
        return Results.Json(new { error = "invalid_request" }, statusCode: StatusCodes.Status400BadRequest);
    }

    var user = await db.Users.SingleOrDefaultAsync(u => u.Username == request.Username);

    // Unknown user still verifies against a dummy hash: both failure paths
    // cost the same (no username probing) and return the same response.
    var verified = Pbkdf2.Verify(request.Password!, user?.PasswordHash ?? Pbkdf2.DummyHash);
    if (user is null || !verified)
    {
        return Results.Json(new { error = "invalid_credentials" }, statusCode: StatusCodes.Status401Unauthorized);
    }

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

// Exposes the implicit Program class to the test host (WebApplicationFactory<Program>).
public partial class Program { }
