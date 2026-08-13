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

    [Theory]
    [InlineData("http://*:5051")]
    [InlineData("http://+:5051")]
    public void A_wildcard_main_url_does_not_smuggle_the_admin_port_past_the_collision_check(string mainUrl)
    {
        // 'http://*:5051' and 'http://+:5051' are the documented ASPNETCORE_URLS
        // forms a container has to use, and neither is a URI Uri.TryCreate will
        // parse. Left unnormalised, the port never reaches the collision check
        // and the admin endpoints end up on the public listener. Kestrel would
        // then abort with AddressInUseException — fail-safe, but a socket error
        // instead of the message this class exists to give.
        var error = ParseError(("Urls", mainUrl), ("AdminUrls", "http://127.0.0.1:5051"));

        Assert.Contains("AdminUrls", error.Message);
        Assert.Contains("5051", error.Message);
    }

    [Theory]
    [InlineData("http://*:5000")]
    [InlineData("http://+:5000")]
    public void A_wildcard_main_url_on_another_port_is_still_fine(string mainUrl)
    {
        // Normalising the host must not turn every wildcard into a collision.
        var options = Parse(("Urls", mainUrl), ("AdminUrls", "http://127.0.0.1:5051"));

        Assert.True(options.Accepts(5051));
        Assert.False(options.Accepts(5000));
    }

    // ---------------------------------------------------------------------
    // What the server ACTUALLY bound, checked against what was asked for.
    //
    // Everything above reads configuration, and configuration is not the last
    // word: 'Kestrel:Endpoints' overrides 'Urls' and 'AdminUrls' ENTIRELY, so
    // a service can be told to serve the admin endpoints on loopback, log a
    // single "Now listening on: http://0.0.0.0:5051", and never create the
    // admin listener at all. Nothing above can see that — only the addresses
    // the server reports once it is up can.
    // ---------------------------------------------------------------------

    private static AdminListenerOptions AdminOn(string adminUrls = "http://127.0.0.1:5051") =>
        Parse(("Urls", "http://localhost:5001"), ("AdminUrls", adminUrls));

    private static Exception BindingError(AdminListenerOptions options, params string[] boundAddresses) =>
        Assert.ThrowsAny<Exception>(() => options.VerifyBoundAddresses(boundAddresses));

    [Fact]
    public void The_bindings_that_were_asked_for_are_accepted()
    {
        AdminOn().VerifyBoundAddresses(["http://localhost:5001", "http://127.0.0.1:5051"]);
    }

    [Theory]
    [InlineData("http://0.0.0.0:5051")]
    [InlineData("http://*:5051")]
    [InlineData("http://[::]:5051")]
    public void A_non_loopback_binding_on_an_admin_port_is_refused_by_name(string boundAddress)
    {
        // The reported blocker: Kestrel:Endpoints put the admin PORT on a
        // public address and the admin listener was never created, so the
        // unauthenticated unlock endpoint answered from off-box.
        var error = BindingError(AdminOn(), boundAddress);

        Assert.Contains("AdminUrls", error.Message);
        Assert.Contains("5051", error.Message);
        Assert.Contains("Kestrel:Endpoints", error.Message);
    }

    [Fact]
    public void An_admin_url_the_server_never_bound_is_refused_by_name()
    {
        // The milder form of the same fault: the admin listener silently does
        // not exist, so the feature is simply gone with no signal at all.
        var error = BindingError(AdminOn(), "http://0.0.0.0:5000");

        Assert.Contains("AdminUrls", error.Message);
        Assert.Contains("http://127.0.0.1:5051", error.Message);
        Assert.Contains("Kestrel:Endpoints", error.Message);
    }

    [Fact]
    public void Every_admin_url_has_to_be_bound_not_just_one_of_them()
    {
        var error = BindingError(
            AdminOn("http://127.0.0.1:5051;http://127.0.0.1:5052"),
            "http://localhost:5001", "http://127.0.0.1:5051");

        Assert.Contains("5052", error.Message);
    }

    [Fact]
    public void A_server_that_reports_no_addresses_is_not_second_guessed()
    {
        // The in-memory test host has no listeners and reports none. "I bound
        // nothing" is not "I bound the wrong thing", and refusing to start on
        // it would only teach the operator that this check cries wolf.
        AdminOn().VerifyBoundAddresses([]);
        AdminOn().VerifyBoundAddresses(null);
    }

    [Fact]
    public void With_the_admin_listener_off_there_is_nothing_to_verify()
    {
        // No admin URL, no admin port, no route mapped — whatever the server
        // bound is none of this class's business.
        Parse().VerifyBoundAddresses(["http://0.0.0.0:5051"]);
    }
}
