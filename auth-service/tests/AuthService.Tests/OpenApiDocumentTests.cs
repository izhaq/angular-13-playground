using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;

namespace AuthService.Tests;

/// <summary>
/// R1.6b — the generated OpenAPI document, served in Development only.
///
/// The contract is the deliverable for the .NET team, and a machine-readable
/// form beside the prose is strictly better than prose alone. But the spec is
/// explicit that it must NOT become a second source of truth: the spec's "API
/// Contract" section stays authoritative and the document is checked against
/// it. That is what this suite is — the check. If someone adds, removes, or
/// re-shapes an endpoint without the spec moving with it, this fails.
///
/// Two things are deliberately absent from the document. <c>/admin/unlock</c>
/// is an operator action outside the client contract (spec, "Manual unlock"),
/// and <c>/api/auth/health</c> is a liveness probe nobody implements against.
/// A published document that lists them invites a client to call them.
///
/// 429 is likewise absent: the rate limiter is infrastructure, and the spec
/// says it is not added to the client contract.
/// </summary>
public class OpenApiDocumentTests : IClassFixture<AuthServiceFactory>
{
    /// <summary>The three endpoints the spec's API Contract section defines.</summary>
    private static readonly string[] ContractPaths =
        ["/api/auth/login", "/api/auth/logout", "/api/auth/session"];

    private const string DocumentUrl = "/openapi/v1.json";

    private readonly AuthServiceFactory _factory;

    public OpenApiDocumentTests(AuthServiceFactory factory)
    {
        _factory = factory;
    }

    private async Task<JsonElement> Paths()
    {
        var response = await _factory.CreateClient().GetAsync(DocumentUrl);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("paths").Clone();
    }

    private static string[] StatusCodesOf(JsonElement paths, string path, string method) =>
        [.. paths.GetProperty(path).GetProperty(method).GetProperty("responses")
            .EnumerateObject().Select(response => response.Name).Order()];

    [Fact]
    public async Task The_document_lists_exactly_the_three_contract_endpoints()
    {
        var paths = await Paths();

        Assert.Equal(
            ContractPaths.Order(),
            paths.EnumerateObject().Select(path => path.Name).Order());
    }

    [Fact]
    public async Task Login_documents_the_contract_status_codes()
    {
        var paths = await Paths();

        // Spec: 200 / 400 invalid_request / 401 invalid_credentials / 423
        // locked. No 429 — the limiter is not part of the contract.
        Assert.Equal(["200", "400", "401", "423"], StatusCodesOf(paths, "/api/auth/login", "post"));
    }

    [Fact]
    public async Task Logout_documents_its_single_status_code()
    {
        var paths = await Paths();

        Assert.Equal(["204"], StatusCodesOf(paths, "/api/auth/logout", "post"));
    }

    [Fact]
    public async Task Session_documents_the_contract_status_codes()
    {
        var paths = await Paths();

        Assert.Equal(["200", "401"], StatusCodesOf(paths, "/api/auth/session", "get"));
    }

    [Fact]
    public async Task The_admin_unlock_endpoint_is_not_published()
    {
        using var withAdmin = _factory.WithWebHostBuilder(builder =>
            builder.UseSetting("AdminUrls", "http://127.0.0.1:5051"));

        var response = await withAdmin.CreateClient().GetAsync(DocumentUrl);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Even with the admin listener switched on, unlocking stays out of the
        // published surface — it is not something a client may call.
        Assert.DoesNotContain("/admin/unlock", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Outside_development_the_document_is_not_served_at_all()
    {
        // A production station publishes no API description: it is a
        // documentation aid for the team, not part of the running service.
        using var production = _factory.WithWebHostBuilder(builder =>
            builder.UseEnvironment("Production"));

        var response = await production.CreateClient().GetAsync(DocumentUrl);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
