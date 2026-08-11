namespace AuthService.Sessions;

/// <summary>
/// The contract's success body for POST /api/auth/login and GET
/// /api/auth/session — the spec says they are the same shape, so they are the
/// same type ("API Contract": session returns "same 200 body as login").
///
/// These records exist because R1.6b publishes an OpenAPI description, and the
/// spec is explicit that the document must not become a second source of
/// truth. Describing the responses with a type the handlers do NOT return
/// would create exactly that: a shape that drifts from what is serialized and
/// is believed anyway. So the handlers return these records, and the document
/// describes the same objects the client receives.
///
/// Serialization is unchanged from the anonymous objects these replaced:
/// minimal APIs use JsonSerializerDefaults.Web, so the property names travel
/// camel-cased and in declaration order.
/// </summary>
public record LoginResponse(UserView User, DateTimeOffset? ExpiresAt);

/// <summary>The identified user, as the client's session store holds it.</summary>
public record UserView(string Username, string Mode, string Position);

/// <summary>
/// The contract's failure body: <c>{"error": "..."}</c>. One shape for every
/// refusal the contract defines — invalid_request, invalid_credentials,
/// locked — because the client switches on the status code and reads this one
/// field.
/// </summary>
public record ErrorResponse(string Error);
