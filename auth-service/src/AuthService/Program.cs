var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/api/auth/health", () => Results.Json(new { status = "ok" }));

app.Run();

// Exposes the implicit Program class to the test host (WebApplicationFactory<Program>).
public partial class Program { }
