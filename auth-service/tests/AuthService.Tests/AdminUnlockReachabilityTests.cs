using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

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

    private const int AdminPort = 5051;

    /// <summary>
    /// The admin listener on, plus the seam that lets a test say which local
    /// address and port accepted the connection (see
    /// <see cref="ConnectionInfoOverride"/>).
    /// </summary>
    private WebApplicationFactory<Program> WithAdminListener() =>
        _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("AdminUrls", $"http://127.0.0.1:{AdminPort}");
            builder.ConfigureServices(services =>
                services.AddSingleton<IStartupFilter, ConnectionInfoOverride>());
        });

    /// <summary>A well-formed unlock request, arriving on the connection the test describes.</summary>
    private static Task<HttpResponseMessage> UnlockOverConnection(
        WebApplicationFactory<Program> factory, string? localAddress, int localPort)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/admin/unlock")
        {
            Content = JsonContent.Create(new { username = "operation" }),
        };

        if (localAddress is not null)
        {
            request.Headers.Add(ConnectionInfoOverride.LocalAddressHeader, localAddress);
        }

        request.Headers.Add(ConnectionInfoOverride.LocalPortHeader, localPort.ToString());

        return factory.CreateClient().SendAsync(request);
    }

    [Fact]
    public async Task A_connection_accepted_on_a_non_loopback_local_address_is_refused()
    {
        // Defence in depth for what the port check alone cannot see: Kestrel's
        // own 'Kestrel:Endpoints' configuration overrides UseUrls entirely, so
        // the admin PORT can end up bound to 0.0.0.0 with the loopback admin
        // listener never created. The port then matches for a connection that
        // arrived from the network. The connection's LOCAL address — our end
        // of the socket, not anything the request says about itself — rules
        // that out. It is not a remote-IP check, and no proxy or header can
        // influence it.
        using var withAdmin = WithAdminListener();

        var response = await UnlockOverConnection(withAdmin, "192.0.2.2", AdminPort);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_loopback_connection_on_the_admin_port_still_reaches_the_endpoint()
    {
        // The control for the test above: the same request differing only in
        // the local address must still be served. A gate that narrowed itself
        // into refusing everything would pass the test above for the wrong
        // reason.
        using var withAdmin = WithAdminListener();

        var response = await UnlockOverConnection(withAdmin, "127.0.0.1", AdminPort);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task A_connection_with_no_local_address_at_all_is_refused()
    {
        // Whatever a server reporting no local address is, it is not proof
        // that the connection arrived on the loopback admin listener.
        using var withAdmin = WithAdminListener();

        var response = await UnlockOverConnection(withAdmin, localAddress: null, AdminPort);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
