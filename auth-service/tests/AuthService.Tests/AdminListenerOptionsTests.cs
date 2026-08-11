using AuthService.Admin;
using Microsoft.Extensions.Configuration;

namespace AuthService.Tests;

/// <summary>
/// R1.5b — where the admin unlock endpoint is allowed to live.
///
/// The spec is emphatic that this must NOT be a remote-IP "loopback only"
/// check: the real deployment puts a reverse proxy on the same machine, so
/// proxied requests from anywhere arrive looking like localhost. The
/// restriction is topological instead — a separate Kestrel listener bound to
/// 127.0.0.1, off unless <c>AdminUrls</c> says otherwise — and this suite pins
/// the two ways that could be undone by configuration alone:
/// binding the admin listener to a public address, or pointing it at the port
/// the public API already answers on.
/// </summary>
public class AdminListenerOptionsTests
{
    private static AdminListenerOptions Parse(params (string Key, string? Value)[] settings) =>
        AdminListenerOptions.FromConfiguration(new ConfigurationBuilder()
            .AddInMemoryCollection(settings.ToDictionary(s => s.Key, s => s.Value))
            .Build());

    private static Exception ParseError(params (string Key, string? Value)[] settings) =>
        Assert.ThrowsAny<Exception>(() => Parse(settings));

    [Fact]
    public void The_admin_listener_is_off_unless_AdminUrls_is_set()
    {
        Assert.False(Parse().IsOn);
    }

    [Fact]
    public void An_empty_AdminUrls_is_also_off()
    {
        Assert.False(Parse(("AdminUrls", "")).IsOn);
    }

    [Fact]
    public void A_loopback_AdminUrls_turns_the_listener_on_for_that_port_only()
    {
        var options = Parse(("Urls", "http://localhost:5001"), ("AdminUrls", "http://127.0.0.1:5051"));

        Assert.True(options.IsOn);
        Assert.True(options.Accepts(5051));

        // The main port must never accept an admin request — that is the whole
        // point of the separate listener.
        Assert.False(options.Accepts(5001));
    }

    [Fact]
    public void A_connection_with_no_local_port_is_not_the_admin_listener()
    {
        // Defensive: whatever a non-Kestrel server reports (0 here), it is not
        // proof that the request came in on the admin listener.
        var options = Parse(("AdminUrls", "http://127.0.0.1:5051"));

        Assert.False(options.Accepts(0));
    }

    [Fact]
    public void The_server_binds_the_main_urls_and_the_admin_urls_together()
    {
        var options = Parse(("Urls", "http://localhost:5001"), ("AdminUrls", "http://127.0.0.1:5051"));

        // Adding the admin listener must not unbind the public API.
        Assert.Equal(["http://localhost:5001", "http://127.0.0.1:5051"], options.ServerUrls);
    }

    [Fact]
    public void Several_admin_urls_are_accepted_the_way_Urls_accepts_them()
    {
        var options = Parse(("AdminUrls", "http://127.0.0.1:5051;http://[::1]:5052"));

        Assert.True(options.Accepts(5051));
        Assert.True(options.Accepts(5052));
    }

    [Fact]
    public void A_non_loopback_AdminUrls_is_rejected_by_name()
    {
        // http://0.0.0.0:5051 would publish the unlock endpoint to the network
        // and hand anyone who can reach it the power to void the lockout.
        var error = ParseError(("AdminUrls", "http://0.0.0.0:5051"));

        Assert.Contains("AdminUrls", error.Message);
    }

    [Fact]
    public void An_AdminUrls_sharing_the_main_port_is_rejected_by_name()
    {
        // Same port = same listener = /admin/unlock answering on the public
        // API's port, which is exactly what the design exists to prevent.
        var error = ParseError(("Urls", "http://localhost:5001"), ("AdminUrls", "http://127.0.0.1:5001"));

        Assert.Contains("AdminUrls", error.Message);
    }

    [Fact]
    public void An_unparseable_AdminUrls_is_rejected_by_name()
    {
        var error = ParseError(("AdminUrls", "127.0.0.1:5051"));

        Assert.Contains("AdminUrls", error.Message);
    }
}
