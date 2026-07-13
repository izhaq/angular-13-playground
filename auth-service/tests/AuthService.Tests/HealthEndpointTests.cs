using System.Net;

namespace AuthService.Tests;

public class HealthEndpointTests : IClassFixture<AuthServiceFactory>
{
    private readonly AuthServiceFactory _factory;

    public HealthEndpointTests(AuthServiceFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Get_health_returns_200_with_status_ok()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/auth/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal("{\"status\":\"ok\"}", body);
    }
}
