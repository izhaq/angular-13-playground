namespace AuthService.Admin;

/// <summary>
/// Where — if anywhere — the operator endpoints are served (R1.5b).
///
/// The spec is explicit that "local only" must NOT be a remote-IP check: the
/// real deployment puts a reverse proxy on the same machine, so proxied
/// requests from anywhere arrive with a loopback remote address. Network
/// topology has to enforce the restriction instead, so the admin routes live
/// on their own Kestrel listener bound to loopback, and the pipeline decides
/// by the LOCAL end of the connection — which listener accepted it, not what
/// the request claims about itself. A request that reached the public port,
/// proxied or not, can never satisfy that.
///
/// Two things about that arrangement are easy to assume wrongly:
///
/// - <b>The listeners are not separate pipelines.</b> A second Kestrel
///   listener is another way IN to the same application, so the admin port
///   serves everything the public port serves — <c>/api/auth/*</c> answers
///   200 there too. Only the reverse is restricted: <c>/admin/*</c> answers on
///   the admin listener alone. This is not an exposure (the admin listener is
///   loopback-only, and anyone standing at the machine can already reach the
///   public port) but it should not come as a surprise.
/// - <b>Configuration is not the last word.</b> <c>Kestrel:Endpoints</c>
///   configuration overrides <c>Urls</c> and <c>AdminUrls</c> outright, so
///   what is asked for here and what is bound can differ — see
///   <see cref="VerifyBoundAddresses"/>.
///
/// Unset by default: no listener, no route, nothing to reach.
/// </summary>
public sealed class AdminListenerOptions
{
    public const string AdminUrlsKey = "AdminUrls";
    private const string MainUrlsKey = "Urls";

    /// <summary>
    /// Kestrel's own configuration section. It is not read here — it is NAMED
    /// here, because it silently overrides both keys above and is therefore
    /// the first thing an operator has to look at when the bindings are not
    /// what they asked for.
    /// </summary>
    private const string KestrelEndpointsKey = "Kestrel:Endpoints";

    /// <summary>ASP.NET Core's own default when <c>Urls</c> is unset — repeated here only so that adding an admin listener can never silently unbind the public API.</summary>
    private const string DefaultMainUrls = "http://localhost:5000";

    private static readonly char[] UrlSeparators = [';'];

    public static AdminListenerOptions Off { get; } = new([], [], new HashSet<int>());

    private AdminListenerOptions(
        IReadOnlyList<string> serverUrls, IReadOnlyList<string> adminUrls, IReadOnlySet<int> ports)
    {
        ServerUrls = serverUrls;
        _adminUrls = adminUrls;
        _ports = ports;
    }

    private readonly IReadOnlyList<string> _adminUrls;
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

        return new AdminListenerOptions([.. mainUrls, .. adminUrls], adminUrls, adminPorts);
    }

    /// <summary>
    /// Checks what the server ACTUALLY bound against what was asked for, and
    /// throws naming the key when the two disagree.
    ///
    /// Everything else in this class reads configuration, and configuration is
    /// not the last word: <c>Kestrel:Endpoints</c> overrides <c>Urls</c> and
    /// <c>AdminUrls</c> entirely (Kestrel logs one line about it and carries
    /// on). A service can therefore be told to serve the operator endpoints on
    /// loopback and never create that listener at all — either losing the
    /// feature with no signal, or, when the public listener happens to hold
    /// the admin port on a public address, answering the unauthenticated
    /// unlock from off-box. Both are configurations this service must refuse
    /// to run under, and only the bound addresses can tell them apart.
    ///
    /// Called once the server is up (see <see cref="AdminListenerGuard"/>),
    /// because that is the earliest moment the answer exists.
    /// </summary>
    /// <param name="boundAddresses">
    /// What the server reports it is listening on. A server that reports
    /// nothing — the in-memory test host — is not second-guessed: "I bound
    /// nothing" is not "I bound the wrong thing".
    /// </param>
    public void VerifyBoundAddresses(IEnumerable<string>? boundAddresses)
    {
        if (!IsOn)
        {
            return;
        }

        var bound = boundAddresses?.ToArray() ?? [];
        if (bound.Length == 0)
        {
            return;
        }

        // 1. Nothing on an admin port may be reachable from the network. This
        //    is the dangerous half: the endpoint is unauthenticated, so a
        //    public binding on that port hands anyone who can reach it the
        //    power to void the lockout.
        foreach (var address in bound)
        {
            if (TryParse(address, out var uri) && _ports.Contains(uri.Port) && !uri.IsLoopback)
            {
                throw new InvalidOperationException(
                    $"'{AdminUrlsKey}' asks for port {uri.Port} on loopback, but the server is listening " +
                    $"on '{address}' — an address the network can reach. The admin endpoints are " +
                    $"unauthenticated, so they must never be bound there. '{KestrelEndpointsKey}' " +
                    $"configuration overrides '{MainUrlsKey}' and '{AdminUrlsKey}' entirely: remove it, " +
                    $"or declare the loopback admin address inside it as well, or remove '{AdminUrlsKey}' " +
                    $"to leave the admin endpoints off.");
            }
        }

        // 2. …and every admin URL has to actually be there. This is the quiet
        //    half: the endpoints simply do not exist, and the operator finds
        //    out at the moment they need them.
        foreach (var url in _adminUrls)
        {
            if (!bound.Any(address => TryPortOf(address) == TryPortOf(url)))
            {
                throw new InvalidOperationException(
                    $"'{AdminUrlsKey}' asks for '{url}', but the server never bound it — it is listening " +
                    $"on {string.Join(", ", bound)}. '{KestrelEndpointsKey}' configuration overrides " +
                    $"'{MainUrlsKey}' and '{AdminUrlsKey}' entirely, which leaves the admin listener " +
                    $"silently absent: remove that configuration, or declare the admin address inside it " +
                    $"as well, or remove '{AdminUrlsKey}' to leave the admin endpoints off.");
            }
        }
    }

    private static List<string> Split(string? urls) =>
        urls is null
            ? []
            : [.. urls.Split(UrlSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];

    private static int? TryPortOf(string url) => TryParse(url, out var uri) ? uri.Port : null;

    /// <summary>
    /// Parses a URL a SERVER may be bound to, which is a wider set than the
    /// URLs a client could ask for: <c>http://*:5051</c> and
    /// <c>http://+:5051</c> are the documented <c>ASPNETCORE_URLS</c> forms —
    /// the ones a container has to use — and <see cref="Uri.TryCreate(string,
    /// UriKind, out Uri)"/> parses neither, because neither host is a host.
    ///
    /// Left as-is they simply drop out of every check here, and the port
    /// collision this class exists to name goes unnoticed. Both mean "every
    /// address", so both normalise to 0.0.0.0 — which is also, correctly, not
    /// a loopback address.
    /// </summary>
    private static bool TryParse(string url, out Uri uri) =>
        Uri.TryCreate(
            url.Replace("://*:", "://0.0.0.0:").Replace("://+:", "://0.0.0.0:"),
            UriKind.Absolute,
            out uri!);
}
