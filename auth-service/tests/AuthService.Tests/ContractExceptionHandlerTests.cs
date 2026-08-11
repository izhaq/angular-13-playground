using System.Text.Json;
using AuthService.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace AuthService.Tests;

/// <summary>
/// R1.6b — the one decision <see cref="ContractExceptionHandler"/> actually
/// owns, now that the framework owns the pipeline: which exceptions are the
/// CLIENT's fault.
///
/// <see cref="ContractHardeningTests"/> covers the real requests end to end.
/// What it cannot easily reach is the negative case, because no endpoint here
/// throws on purpose — and that case is the important one. Answering
/// "invalid_request" to a service-side fault would blame the caller for our
/// bug, hide a 500 from whoever is watching the service, and tell the login
/// page to render "check your input" for something the user cannot fix.
/// </summary>
public class ContractExceptionHandlerTests
{
    private readonly ContractExceptionHandler _handler = new();

    private static DefaultHttpContext Context()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static string BodyOf(HttpContext context)
    {
        context.Response.Body.Position = 0;
        return new StreamReader(context.Response.Body).ReadToEnd();
    }

    public static TheoryData<Exception> MalformedRequests => new()
    {
        new BadHttpRequestException("failed to read parameter"),
        new JsonException("unexpected token"),
    };

    [Theory]
    [MemberData(nameof(MalformedRequests))]
    public async Task A_malformed_request_is_answered_with_the_contract_400(Exception exception)
    {
        var context = Context();

        var handled = await _handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
        using var body = JsonDocument.Parse(BodyOf(context));
        Assert.Equal("invalid_request", body.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Any_other_exception_is_left_alone_to_be_a_500()
    {
        var context = Context();

        var handled = await _handler.TryHandleAsync(
            context, new InvalidOperationException("the database is on fire"), CancellationToken.None);

        Assert.False(handled);
        Assert.Equal(string.Empty, BodyOf(context));
    }

    [Fact]
    public async Task A_response_that_has_already_started_is_not_rewritten()
    {
        // Nothing can be reshaped once bytes are on the wire; claiming to have
        // handled it would leave the server with a half-written response and
        // no error to abort on.
        var features = new FeatureCollection();
        features.Set<IHttpRequestFeature>(new HttpRequestFeature());
        features.Set<IHttpResponseFeature>(new AlreadyStartedResponse());
        var context = new DefaultHttpContext(features);

        var handled = await _handler.TryHandleAsync(
            context, new JsonException("too late"), CancellationToken.None);

        Assert.False(handled);
    }

    /// <summary>A response the server has already begun writing.</summary>
    private sealed class AlreadyStartedResponse : HttpResponseFeature
    {
        public override bool HasStarted => true;
    }
}
