using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SchoolAdmission.Api.Background;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Tests;

public class HoldLifecycleTests : IAsyncLifetime
{
    private readonly ApiFactory _factory = new();
    private HttpClient _client = default!;

    public Task InitializeAsync()
    {
        _client = _factory.CreateClient();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Confirming_a_hold_moves_the_seat_from_held_to_confirmed()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 3);
        var studentId = ApiClient.NewStudentId();
        var hold = await _client.CreateHoldAsync(schoolClass.Id, studentId);
        Assert.Equal("HELD", hold.Status);

        var first = await _client.ConfirmAsync(hold.HoldId, studentId);
        var second = await _client.ConfirmAsync(hold.HoldId, studentId);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal("CONFIRMED", (await second.Content.ReadFromJsonAsync<HoldDto>())!.Status);

        var after = await _client.GetClassAsync(schoolClass.Id);
        Assert.Equal(1, after.ConfirmedSeats);
        Assert.Equal(0, after.HeldSeats);
    }

    [Fact]
    public async Task Expired_hold_releases_the_seat_and_cannot_be_confirmed()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 1);
        var studentId = ApiClient.NewStudentId();
        var hold = await _client.CreateHoldAsync(schoolClass.Id, studentId);

        var whileFull = await _client.HoldAsync(schoolClass.Id, ApiClient.NewStudentId());
        Assert.Equal(HttpStatusCode.Conflict, whileFull.StatusCode);

        _factory.Clock.Advance(TimeSpan.FromSeconds(601));

        var status = await _client.GetFromJsonAsync<HoldDto>($"/holds/{hold.HoldId}");
        Assert.Equal("EXPIRED", status!.Status);
        Assert.Equal(1, (await _client.GetClassAsync(schoolClass.Id)).AvailableSeats);

        var confirm = await _client.ConfirmAsync(hold.HoldId, studentId);
        Assert.Equal(HttpStatusCode.Conflict, confirm.StatusCode);
        Assert.Equal("HOLD_EXPIRED", await confirm.ErrorCodeAsync());

        var someoneElse = await _client.HoldAsync(schoolClass.Id, ApiClient.NewStudentId());
        Assert.Equal(HttpStatusCode.Created, someoneElse.StatusCode);
    }

    [Fact]
    public async Task Background_sweeper_marks_overdue_holds_as_expired()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 2);
        var hold = await _client.CreateHoldAsync(schoolClass.Id, ApiClient.NewStudentId());
        _factory.Clock.Advance(TimeSpan.FromSeconds(601));

        var sweeper = _factory.Services.GetServices<IHostedService>().OfType<ExpiredHoldSweeper>().Single();
        var released = await sweeper.SweepOnceAsync(CancellationToken.None);

        Assert.True(released >= 1);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        Assert.Equal(HoldStatus.Expired, await db.Holds.Where(h => h.Id == hold.HoldId).Select(h => h.Status).SingleAsync());
    }

    [Fact]
    public async Task Only_the_owner_can_confirm_or_cancel_a_hold()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 2);
        var hold = await _client.CreateHoldAsync(schoolClass.Id, ApiClient.NewStudentId());
        var stranger = ApiClient.NewStudentId();

        var confirm = await _client.ConfirmAsync(hold.HoldId, stranger);
        var cancel = await _client.CancelAsync(hold.HoldId, stranger);

        Assert.Equal(HttpStatusCode.Forbidden, confirm.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, cancel.StatusCode);
        Assert.Equal(0, (await _client.GetClassAsync(schoolClass.Id)).ConfirmedSeats);
    }

    [Fact]
    public async Task Cancelling_a_hold_frees_the_seat_and_allows_applying_again()
    {
        var schoolClass = await _client.CreateClassAsync(totalSeats: 1);
        var studentId = ApiClient.NewStudentId();
        var hold = await _client.CreateHoldAsync(schoolClass.Id, studentId);

        var duplicate = await _client.HoldAsync(schoolClass.Id, studentId);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("ALREADY_APPLIED", await duplicate.ErrorCodeAsync());

        var cancel = await _client.CancelAsync(hold.HoldId, studentId);
        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);
        Assert.Equal(1, (await _client.GetClassAsync(schoolClass.Id)).AvailableSeats);

        var confirmCancelled = await _client.ConfirmAsync(hold.HoldId, studentId);
        Assert.Equal("HOLD_CANCELLED", await confirmCancelled.ErrorCodeAsync());

        var again = await _client.HoldAsync(schoolClass.Id, studentId);
        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
    }

    [Fact]
    public async Task My_holds_lists_every_application_of_the_student()
    {
        var studentId = ApiClient.NewStudentId();
        var morning = await _client.CreateClassAsync(totalSeats: 5, name: "Class 7 - Morning " + Guid.NewGuid().ToString("N")[..4]);
        var day = await _client.CreateClassAsync(totalSeats: 5, name: "Class 7 - Day " + Guid.NewGuid().ToString("N")[..4]);
        await _client.CreateHoldAsync(morning.Id, studentId);
        var dayHold = await _client.CreateHoldAsync(day.Id, studentId);
        await _client.ConfirmAsync(dayHold.HoldId, studentId);
        await _client.CreateHoldAsync(day.Id, ApiClient.NewStudentId());

        var response = await _client.SendAsync(ApiClient.WithStudent(HttpMethod.Get, "/me/holds", studentId));
        var holds = (await response.Content.ReadFromJsonAsync<List<HoldDto>>())!;

        Assert.Equal(2, holds.Count);
        Assert.Contains(holds, h => h.ClassId == day.Id && h.Status == "CONFIRMED" && h.ClassName == day.Name);
        Assert.Contains(holds, h => h.ClassId == morning.Id && h.Status == "HELD");
    }
}
