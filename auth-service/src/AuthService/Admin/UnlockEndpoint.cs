using AuthService.Sessions;

namespace AuthService.Admin;

/// <summary>The admin unlock request body. Not part of the client-facing contract.</summary>
public record UnlockRequest(string? Username);

/// <summary>
/// <c>POST /admin/unlock</c> (R1.5b) — the opt-in companion to the
/// <c>AuthService unlock</c> command, for when someone would rather curl than
/// open a shell in the service's folder.
///
/// It lives outside <c>/api/auth/*</c> on purpose: unlocking is an operator
/// action, not part of the API contract the Angular client implements, and no
/// client code calls it. It is served only on the loopback admin listener —
/// see <see cref="AdminListenerOptions"/> for why that is a listener and not
/// an IP check.
///
/// Everything it can answer is 204, apart from a request that names no
/// username at all. Locked, unlocked, never seen — same reply, so it reveals
/// nothing to whoever can reach it.
/// </summary>
public static class UnlockEndpoint
{
    /// <summary>The path prefix the pipeline gate protects — everything under it is admin-listener only.</summary>
    public const string PathPrefix = "/admin";

    public const string Route = "/admin/unlock";

    public static async Task<IResult> Handle(UnlockRequest request, LockoutService lockout)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            // The one honest refusal: nothing was named, so nothing was
            // released. Same body shape as the login contract's 400.
            return Results.Json(new { error = "invalid_request" }, statusCode: StatusCodes.Status400BadRequest);
        }

        await lockout.Unlock(request.Username);
        return Results.NoContent();
    }
}
