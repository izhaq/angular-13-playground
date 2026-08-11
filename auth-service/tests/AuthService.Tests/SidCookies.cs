namespace AuthService.Tests;

/// <summary>
/// Reads the <c>sid</c> Set-Cookie header. Shared so every suite parses the
/// cookie the same way — the cookie IS the session, so a test that hand-rolls
/// its own parsing can quietly assert something slightly different.
/// </summary>
public static class SidCookies
{
    /// <summary>The whole <c>sid=...</c> Set-Cookie header. Fails the test if there is not exactly one.</summary>
    public static string Header(HttpResponseMessage response) =>
        response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("sid="));

    /// <summary>The sid value itself, without attributes.</summary>
    public static string Value(HttpResponseMessage response) =>
        Header(response).Split(';')[0]["sid=".Length..];

    /// <summary>The cookie's Max-Age in seconds — how long the browser keeps the session.</summary>
    public static long MaxAgeSeconds(HttpResponseMessage response)
    {
        var maxAge = Header(response).Split(';')
            .Select(part => part.Trim())
            .Single(part => part.StartsWith("max-age=", StringComparison.OrdinalIgnoreCase));
        return long.Parse(maxAge["max-age=".Length..]);
    }
}
