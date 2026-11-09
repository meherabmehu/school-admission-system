using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Tests;

public class ConcurrencyTests : IAsyncLifetime
{
    private readonly ApiFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Many_parallel_hold_requests_never_take_more_seats_than_the_class_has()
    {
        var client = _factory.CreateClient();
        var schoolClass = await client.CreateClassAsync(totalSeats: 10);

        var responses = await Task.WhenAll(Enumerable.Range(0, 100)
            .Select(_ => client.HoldAsync(schoolClass.Id, ApiClient.NewStudentId())));

        Assert.Equal(10, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(90, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        foreach (var rejected in responses.Where(r => r.StatusCode == HttpStatusCode.Conflict))
            Assert.Equal("NO_SEATS_AVAILABLE", await rejected.ErrorCodeAsync());

        var after = await client.GetClassAsync(schoolClass.Id);
        Assert.Equal(10, after.HeldSeats);
        Assert.Equal(0, after.AvailableSeats);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        Assert.Equal(10, await db.Holds.CountAsync(h => h.ClassId == schoolClass.Id));
    }

    [Fact]
    public async Task Same_student_sending_parallel_requests_gets_only_one_hold()
    {
        var client = _factory.CreateClient();
        var schoolClass = await client.CreateClassAsync(totalSeats: 50);
        var studentId = ApiClient.NewStudentId();

        var responses = await Task.WhenAll(Enumerable.Range(0, 20)
            .Select(_ => client.HoldAsync(schoolClass.Id, studentId)));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
        Assert.Equal(19, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.Equal(1, (await client.GetClassAsync(schoolClass.Id)).HeldSeats);
    }

    [Fact]
    public async Task Parallel_confirms_of_the_same_hold_count_the_seat_once()
    {
        var client = _factory.CreateClient();
        var schoolClass = await client.CreateClassAsync(totalSeats: 5);
        var studentId = ApiClient.NewStudentId();
        var hold = await client.CreateHoldAsync(schoolClass.Id, studentId);

        var responses = await Task.WhenAll(Enumerable.Range(0, 10)
            .Select(_ => client.ConfirmAsync(hold.HoldId, studentId)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        var after = await client.GetClassAsync(schoolClass.Id);
        Assert.Equal(1, after.ConfirmedSeats);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(4, after.AvailableSeats);
    }

    [Fact]
    public async Task Two_backend_instances_sharing_one_database_do_not_overbook()
    {
        await using var secondInstance = new ApiFactory(_factory.ConnectionString, "second-instance");
        var first = _factory.CreateClient();
        var second = secondInstance.CreateClient();
        var schoolClass = await first.CreateClassAsync(totalSeats: 15);

        var responses = await Task.WhenAll(Enumerable.Range(0, 80)
            .Select(i => (i % 2 == 0 ? first : second).HoldAsync(schoolClass.Id, ApiClient.NewStudentId())));

        Assert.Equal(15, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(15, (await second.GetClassAsync(schoolClass.Id)).HeldSeats);
    }
}
