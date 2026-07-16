using AuthService.Data;
using AuthService.Sessions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

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

    http.Response.Cookies.Append("sid", session.Sid, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Path = "/",
        MaxAge = sessions.Ttl,
        // No Secure flag: dev runs on plain HTTP. Production behind TLS adds it.
    });

    return Results.Ok(new
    {
        user = new { username = user.Username, mode = session.Mode, position = session.Position },
        expiresAt = session.ExpiresAt,
    });
});

app.MapGet("/api/auth/session", async (SessionService sessions, HttpContext http) =>
{
    // Spec: 200 with the same body shape as login, "or 401 if no valid
    // session" — the spec defines no 401 body for /session, so none is sent.
    if (!http.Request.Cookies.TryGetValue("sid", out var sid) || string.IsNullOrEmpty(sid))
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
