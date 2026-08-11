using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;

namespace AuthService.Tests;

/// <summary>
/// R1.5b — the load-bearing half of the admin endpoint: where it does NOT
/// answer.
///
/// The spec forbids implementing "local only" as a remote-IP check, because a
/// same-host reverse proxy makes every request look local. So the rule is
/// about which LISTENER accepted the connection, and these tests come at it
/// from both sides of the switch:
/// - with <c>AdminUrls</c> unset the route is not mapped at all;
/// - with it set, a request that did not arrive on the admin listener is still
///   a 404 — the main port never grows the route, whatever the request says
///   about itself.
///
/// The happy path (204 on the admin listener) needs two real Kestrel ports,
/// which the in-memory test host does not have; it is covered by
/// <see cref="AdminUnlockEndpointTests"/> at the handler level and by the
/// live check in the slice's review.
/// </summary>
public class AdminUnlockReachabilityTests : IDisposable
{
    private readonly AuthServiceFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static Task<HttpResponseMessage> Unlock(HttpClient client) =>
        client.PostAsJsonAsync("/admin/unlock", new { username = "operation" });

    [Fact]
    public async Task With_AdminUrls_unset_the_route_does_not_exist_on_the_main_port()
    {
        var response = await Unlock(_factory.CreateClient());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task With_AdminUrls_set_the_main_port_still_answers_404()
    {
        using var withAdmin = _factory.WithWebHostBuilder(builder =>
            builder.UseSetting("AdminUrls", "http://127.0.0.1:5051"));

        var response = await Unlock(withAdmin.CreateClient());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_malformed_admin_request_is_a_404_as_well_not_a_400()
    {
        // A 400 would answer "the route is here, your body is wrong" — the
        // route's existence must not leak on the public port either, so the
        // gate runs before the body is ever bound.
        using var withAdmin = _factory.WithWebHostBuilder(builder =>
            builder.UseSetting("AdminUrls", "http://127.0.0.1:5051"));

        var response = await withAdmin.CreateClient().PostAsJsonAsync("/admin/unlock", new { nonsense = 1 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Turning_the_admin_listener_on_leaves_the_client_facing_api_alone()
    {
        using var withAdmin = _factory.WithWebHostBuilder(builder =>
            builder.UseSetting("AdminUrls", "http://127.0.0.1:5051"));

        var response = await withAdmin.CreateClient().PostAsJsonAsync("/api/auth/login",
            new { username = "operation", password = "operation123!", mode = "operation", position = "active" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
