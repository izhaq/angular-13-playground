using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

namespace AuthService.Admin;

/// <summary>
/// Refuses to run a service whose admin listener is not where
/// <c>AdminUrls</c> says it is (R1.5b).
///
/// Same job as <c>SchemaGuard</c>, one layer out: fail loudly once at startup
/// instead of quietly forever. <see cref="AdminListenerOptions"/> validates
/// what was CONFIGURED, but <c>Kestrel:Endpoints</c> configuration overrides
/// <c>Urls</c> and <c>AdminUrls</c> outright, so the configured answer and the
/// bound answer can differ — and the difference is either a feature that
/// silently is not there or an unauthenticated endpoint bound where the
/// network can reach it.
///
/// It runs as <see cref="IHostedLifecycleService.StartedAsync"/> rather than
/// from an <c>ApplicationStarted</c> callback for a plain reason: the host
/// LOGS and swallows exceptions thrown from that callback, so a refusal there
/// would not refuse anything. Thrown from here, it comes out of
/// <c>app.Run()</c> and the process stops.
///
/// The listeners are necessarily already open by the time the addresses can be
/// read, so this is not the only defence — the /admin gate independently
/// requires a loopback LOCAL address, which covers that window and anything
/// this check has not thought of.
/// </summary>
public sealed class AdminListenerGuard(AdminListenerOptions options, IServer server) : IHostedLifecycleService
{
    public Task StartedAsync(CancellationToken cancellationToken)
    {
        options.VerifyBoundAddresses(server.Features.Get<IServerAddressesFeature>()?.Addresses);
        return Task.CompletedTask;
    }

    public Task StartingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StoppingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task StoppedAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
