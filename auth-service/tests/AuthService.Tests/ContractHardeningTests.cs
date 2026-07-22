using System.Net;
using System.Text;
using System.Text.Json;

namespace AuthService.Tests;

/// <summary>
/// Contract hardening for the 400 path (spec "API Contract": 400 →
/// {"error":"invalid_request"} — "missing or malformed fields").
///
/// Field-level validation (LoginRequest.IsValid) already answers with the
/// contract body, but requests that fail BEFORE binding — malformed JSON,
/// wrong field types, a null/empty body, a non-JSON content type — used to
/// surface as the framework's built-in rejection with an EMPTY body,
/// bypassing the contract. Every client-caused rejection must carry the
/// same contract body, no matter how early it fails.
///
/// 415 vs 400 for a non-JSON content type: the contract enumerates exactly
/// 400/401/423 for login and defines 400 as "missing or malformed"; a body
/// that is not JSON at all is the extreme case of malformed. Answering 415
/// would add a status the contract does not define — a contract change,
/// which the spec says must update spec + client + server together. So:
/// 400 + contract body.
/// </summary>
public class ContractHardeningTests : IClassFixture<AuthServiceFactory>
{
    private readonly AuthServiceFactory _factory;

    public ContractHardeningTests(AuthServiceFactory factory)
    {
        _factory = factory;
    }

    private static async Task AssertContract400(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("invalid_request", body.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Login_with_malformed_json_syntax_returns_400_with_contract_body()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/auth/login",
            new StringContent(@"{""username"": <-- not json", Encoding.UTF8, "application/json"));

        await AssertContract400(response);
    }

    [Fact]
    public async Task Login_with_wrong_field_type_returns_400_with_contract_body()
    {
        var client = _factory.CreateClient();

        // mode is a number — binds to string? only by throwing.
        var response = await client.PostAsync("/api/auth/login",
            new StringContent(
                @"{""username"":""operation"",""password"":""operation123!"",""mode"":7,""position"":""active""}",
                Encoding.UTF8, "application/json"));

        await AssertContract400(response);
    }

    [Fact]
    public async Task Login_with_json_null_body_returns_400_with_contract_body()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/auth/login",
            new StringContent("null", Encoding.UTF8, "application/json"));

        await AssertContract400(response);
    }

    [Fact]
    public async Task Login_with_empty_body_returns_400_with_contract_body()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/auth/login",
            new StringContent(string.Empty, Encoding.UTF8, "application/json"));

        await AssertContract400(response);
    }

    [Fact]
    public async Task Login_with_text_plain_content_type_returns_400_with_contract_body()
    {
        var client = _factory.CreateClient();

        // Even a well-formed payload is "malformed" as a request when it does
        // not declare itself JSON — see the 415-vs-400 note in the class doc.
        var response = await client.PostAsync("/api/auth/login",
            new StringContent(
                @"{""username"":""operation"",""password"":""operation123!"",""mode"":""operation"",""position"":""active""}",
                Encoding.UTF8, "text/plain"));

        await AssertContract400(response);
    }
}
