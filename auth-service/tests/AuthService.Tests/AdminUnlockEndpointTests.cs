using AuthService.Admin;
using AuthService.Data;
using AuthService.Sessions;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Tests;

/// <summary>
/// R1.5b — what <c>POST /admin/unlock</c> answers. The handler is called
/// directly here because reaching it over HTTP requires the real admin
/// listener, which the in-memory test host has no ports for
/// (see <see cref="AdminUnlockReachabilityTests"/> for the other half:
/// where it must NOT answer).
///
/// The endpoint reveals nothing: a locked username, an unlocked one and one
/// that was never seen all get the same 204, so it cannot be used to ask which
/// accounts exist or which are currently locked.
/// </summary>
public class AdminUnlockEndpointTests : IDisposable
{
    private const int MaxAttempts = 3;

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly AuthDb _db;
    private readonly LockoutService _lockout;

    public AdminUnlockEndpointTests()
    {
        _connection.Open();
        _db = new AuthDb(new DbContextOptionsBuilder<AuthDb>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        _lockout = new LockoutService(_db, LockoutOptions.On(MaxAttempts, TimeSpan.FromMinutes(15)));
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private static int StatusOf(IResult result) => Assert.IsAssignableFrom<IStatusCodeHttpResult>(result).StatusCode!.Value;

    private async Task LockOut(string username)
    {
        for (var i = 0; i < MaxAttempts; i++)
        {
            await _lockout.RecordFailure(username);
        }
    }

    [Fact]
    public async Task Unlocking_a_locked_username_answers_204_and_releases_it()
    {
        await LockOut("operation");

        var result = await UnlockEndpoint.Handle(new UnlockRequest("operation"), _lockout);

        Assert.Equal(StatusCodes.Status204NoContent, StatusOf(result));
        Assert.False(await _lockout.IsLocked("operation"));
    }

    [Fact]
    public async Task Unlocking_a_username_that_is_not_locked_answers_204_too()
    {
        var result = await UnlockEndpoint.Handle(new UnlockRequest("operation"), _lockout);

        Assert.Equal(StatusCodes.Status204NoContent, StatusOf(result));
    }

    [Fact]
    public async Task Unlocking_a_username_nobody_has_ever_submitted_answers_204_too()
    {
        // Idempotent and silent: the answer must not tell the caller whether
        // the account exists or whether it was locked.
        var result = await UnlockEndpoint.Handle(new UnlockRequest("nobody-at-all"), _lockout);

        Assert.Equal(StatusCodes.Status204NoContent, StatusOf(result));
    }

    [Fact]
    public async Task A_missing_username_is_a_400_not_a_silent_success()
    {
        // The one case where saying "fine" would be a lie — nothing was asked
        // for, so nothing was released.
        var result = await UnlockEndpoint.Handle(new UnlockRequest(null), _lockout);

        Assert.Equal(StatusCodes.Status400BadRequest, StatusOf(result));
    }

    [Fact]
    public async Task A_blank_username_is_a_400_as_well()
    {
        var result = await UnlockEndpoint.Handle(new UnlockRequest("   "), _lockout);

        Assert.Equal(StatusCodes.Status400BadRequest, StatusOf(result));
    }
}
