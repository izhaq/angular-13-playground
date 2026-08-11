namespace AuthService.Admin;

/// <summary>
/// Where — if anywhere — the operator endpoints are served (R1.5b).
///
/// The spec is explicit that "local only" must NOT be a remote-IP check: the
/// real deployment puts a reverse proxy on the same machine, so proxied
/// requests from anywhere arrive with a loopback remote address. Network
/// topology has to enforce the restriction instead, so the admin routes live
/// on their own Kestrel listener bound to loopback, and the pipeline decides
/// by the LOCAL port a connection arrived on — which listener accepted it,
/// not what the request claims about itself. A request that reached the public
/// port, proxied or not, can never satisfy that.
///
/// Unset by default: no listener, no route, nothing to reach.
/// </summary>
public sealed class AdminListenerOptions
{
    public const string AdminUrlsKey = "AdminUrls";
    private const string MainUrlsKey = "Urls";

    /// <summary>ASP.NET Core's own default when <c>Urls</c> is unset — repeated here only so that adding an admin listener can never silently unbind the public API.</summary>
    private const string DefaultMainUrls = "http://localhost:5000";

    private static readonly char[] UrlSeparators = [';'];

    public static AdminListenerOptions Off { get; } = new([], new HashSet<int>());

    private AdminListenerOptions(IReadOnlyList<string> serverUrls, IReadOnlySet<int> ports)
    {
        ServerUrls = serverUrls;
        _ports = ports;
    }

    private readonly IReadOnlySet<int> _ports;

    /// <summary>
    /// Every URL the server should bind: the configured main URLs first, then
    /// the admin ones. Passing only the admin URL to Kestrel would take the
    /// public API off the air, so the two always travel together.
    /// </summary>
    public IReadOnlyList<string> ServerUrls { get; }

    public bool IsOn => _ports.Count > 0;

    /// <summary>Whether a connection accepted on this local port arrived on the admin listener.</summary>
    public bool Accepts(int localPort) => _ports.Contains(localPort);

    public static AdminListenerOptions FromConfiguration(IConfiguration configuration)
    {
        var adminUrls = Split(configuration[AdminUrlsKey]);
        if (adminUrls.Count == 0)
        {
            return Off;
        }

        var mainUrls = Split(configuration[MainUrlsKey]);
        if (mainUrls.Count == 0)
        {
            mainUrls = Split(DefaultMainUrls);
        }

        var mainPorts = mainUrls.Select(TryPortOf).Where(port => port is not null).ToHashSet();

        var adminPorts = new HashSet<int>();
        foreach (var url in adminUrls)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            {
                throw new InvalidOperationException(
                    $"'{AdminUrlsKey}' contains '{url}', which is not a URL. " +
                    $"Use a full loopback address such as 'http://127.0.0.1:5051', " +
                    $"or remove '{AdminUrlsKey}' to leave the admin endpoints off.");
            }

            if (!uri.IsLoopback)
            {
                // The endpoint is unauthenticated by design — its authorisation
                // IS "you are physically at the station". Binding it anywhere
                // reachable from the network hands that away.
                throw new InvalidOperationException(
                    $"'{AdminUrlsKey}' points at '{uri.Host}', which is not a loopback address. " +
                    $"The admin endpoints are unauthenticated and must never leave the machine — " +
                    $"bind them to 127.0.0.1 (or ::1), or remove '{AdminUrlsKey}' to leave them off.");
            }

            if (mainPorts.Contains(uri.Port))
            {
                // Same port means the same listener, which would put
                // /admin/unlock on the public API's port — the exact outcome
                // the separate listener exists to prevent.
                throw new InvalidOperationException(
                    $"'{AdminUrlsKey}' uses port {uri.Port}, which the service already serves its public API on. " +
                    $"The admin endpoints must have a port of their own, or they end up reachable " +
                    $"through whatever proxies the public port.");
            }

            adminPorts.Add(uri.Port);
        }

        return new AdminListenerOptions([.. mainUrls, .. adminUrls], adminPorts);
    }

    private static List<string> Split(string? urls) =>
        urls is null
            ? []
            : [.. urls.Split(UrlSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];

    private static int? TryPortOf(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri) ? uri.Port : null;
}
