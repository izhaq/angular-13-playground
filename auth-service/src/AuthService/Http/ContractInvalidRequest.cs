using AuthService.Sessions;

namespace AuthService.Http;

/// <summary>
/// The contract's <c>400 {"error":"invalid_request"}</c>, written from the one
/// place both early-rejection paths reach for it (R1.6b).
/// </summary>
internal static class ContractInvalidRequest
{
    public static Task Write(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return context.Response.WriteAsJsonAsync(new ErrorResponse("invalid_request"));
    }
}
