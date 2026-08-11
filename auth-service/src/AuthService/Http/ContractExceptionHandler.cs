using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;

namespace AuthService.Http;

/// <summary>
/// Contract hardening for requests that die BEFORE an endpoint runs — malformed
/// JSON syntax, wrong field types, a null or empty body. They must answer the
/// contract's 400 body exactly like field-level validation does (spec, "API
/// Contract": <c>400 → {"error":"invalid_request"}</c>, "missing or malformed
/// fields"), not the framework's silent empty-bodied 400.
///
/// <c>RouteHandlerOptions.ThrowOnBadRequest</c> is pinned on in
/// <c>Program</c>, so every binding failure arrives here as an exception
/// instead of an empty response — which is what lets one handler cover them
/// all. Before .NET 10 this was a hand-written try/catch middleware; the
/// framework now owns the pipeline piece (R1.6b) and this class is left with
/// only the decision that is actually ours: which exceptions are the client's
/// fault, and what the contract says to answer.
///
/// It runs INSIDE the CORS middleware's scope (registered after
/// <c>UseCors</c>), so the CORS headers — which CORS re-applies from an
/// OnStarting callback — survive the response being cleared and rewritten. A
/// cross-origin browser that lost them would report status 0, and the client
/// would render "service unreachable" instead of the honest invalid_request.
/// <c>ContractHardeningTests.Reshaped_contract_400_still_carries_cors_headers</c>
/// pins that.
/// </summary>
public sealed class ContractExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not (BadHttpRequestException or JsonException))
        {
            // Not a malformed request — a genuine fault. Saying "invalid
            // request" would blame the caller for the service's own bug and
            // hide the 500 from whoever is watching.
            return false;
        }

        if (httpContext.Response.HasStarted)
        {
            // Too late to reshape anything; letting the server abort the
            // response is the only honest answer left.
            return false;
        }

        httpContext.Response.Clear();
        await ContractInvalidRequest.Write(httpContext);
        return true;
    }
}
