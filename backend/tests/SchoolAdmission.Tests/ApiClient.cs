using System.Net;
using System.Net.Http.Json;

namespace SchoolAdmission.Tests;

public record ClassDto(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);

public record HoldDto(string HoldId, string ClassId, string ClassName, string StudentId, string Status, DateTime ExpiresAt);

public record ErrorDto(string Error, string Message, string? HoldId);

public static class ApiClient
{
    private static int _studentCounter;

    public static string NewStudentId() =>
        "2015" + Interlocked.Increment(ref _studentCounter).ToString().PadLeft(13, '0');

    public static async Task<ClassDto> CreateClassAsync(this HttpClient client, int totalSeats, string? name = null)
    {
        var response = await client.PostAsJsonAsync("/classes",
            new { name = name ?? "Class " + Guid.NewGuid().ToString("N")[..8], totalSeats });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ClassDto>())!;
    }

    public static async Task<ClassDto> GetClassAsync(this HttpClient client, string classId) =>
        (await client.GetFromJsonAsync<ClassDto>($"/classes/{classId}"))!;

    public static Task<HttpResponseMessage> HoldAsync(this HttpClient client, string classId, string studentId) =>
        client.SendAsync(WithStudent(HttpMethod.Post, $"/classes/{classId}/holds", studentId));

    public static Task<HttpResponseMessage> ConfirmAsync(this HttpClient client, string holdId, string studentId) =>
        client.SendAsync(WithStudent(HttpMethod.Post, $"/holds/{holdId}/confirm", studentId));

    public static Task<HttpResponseMessage> CancelAsync(this HttpClient client, string holdId, string studentId) =>
        client.SendAsync(WithStudent(HttpMethod.Delete, $"/holds/{holdId}", studentId));

    public static async Task<HoldDto> CreateHoldAsync(this HttpClient client, string classId, string studentId)
    {
        var response = await client.HoldAsync(classId, studentId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<HoldDto>())!;
    }

    public static async Task<string> ErrorCodeAsync(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<ErrorDto>())!.Error;

    public static HttpRequestMessage WithStudent(HttpMethod method, string url, string studentId)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-Student-Id", studentId);
        return request;
    }
}
