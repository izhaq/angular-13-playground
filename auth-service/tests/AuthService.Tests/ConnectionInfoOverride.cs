using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace AuthService.Tests;

/// <summary>
/// Test-only: lets a test say which local address and local port accepted a
/// connection — the two facts the admin gate decides on.
///
/// The in-memory test host gives every request the same (empty) connection,
/// and <c>TestServer.SendAsync</c>, which does expose the connection features,
/// cannot carry a request body — so a test written that way could never reach
/// the endpoint it is trying to prove is reachable. This runs as an
/// <see cref="IStartupFilter"/> instead, which puts it AHEAD of the service's
/// own pipeline, and copies two headers onto <c>HttpContext.Connection</c>
/// before the gate ever looks at it. The request itself is otherwise a normal
/// end-to-end <c>HttpClient</c> request, body and all.
///
/// Nothing in the service reads these headers; they exist only to stand in for
/// the socket the test host does not have.
/// </summary>
internal sealed class ConnectionInfoOverride : IStartupFilter
{
    public const string LocalAddressHeader = "X-Test-Local-Address";
    public const string LocalPortHeader = "X-Test-Local-Port";

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) =>
        app =>
        {
            app.Use(async (context, nextMiddleware) =>
            {
                if (context.Request.Headers.TryGetValue(LocalAddressHeader, out var address))
                {
                    context.Connection.LocalIpAddress = IPAddress.Parse(address.ToString());
                }

                if (context.Request.Headers.TryGetValue(LocalPortHeader, out var port))
                {
                    context.Connection.LocalPort = int.Parse(port.ToString());
                }

                await nextMiddleware(context);
            });

            next(app);
        };
}
