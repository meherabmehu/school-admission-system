using System.Net;
using System.Net.Http.Json;

namespace SchoolAdmission.Tests;

public class ValidationTests : IAsyncLifetime
{
    private readonly ApiFactory _factory = new();
    private HttpClient _client = default!;

    public Task InitializeAsync()
    {
        _client = _factory.CreateClient();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Theory]
    [InlineData("", 10)]
    [InlineData("   ", 10)]
    [InlineData("Class 8", 0)]
    [InlineData("Class 8", -5)]
    public async Task Creating_a_class_with_invalid_input_returns_400(string name, int totalSeats)
    {
        var response = await _client.PostAsJsonAsync("/classes", new { name, totalSeats });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await response.ErrorCodeAsync());
    }

    [Fact]
    public async Task Malformed_json_returns_a_json_error()
    {
        var response = await _client.PostAsync("/classes",
            new StringContent("{\"name\": \"x\", \"totalSeats\": \"many\"}", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("INVALID_REQUEST", await response.ErrorCodeAsync());
    }

    [Fact]
    public async Task Duplicate_class_names_are_rejected_ignoring_case_and_spaces()
    {
        await _client.CreateClassAsync(10, "Class 9 - Morning Shift");

        var response = await _client.PostAsJsonAsync("/classes", new { name = "class 9  -  morning shift", totalSeats = 10 });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("CLASS_ALREADY_EXISTS", await response.ErrorCodeAsync());
    }

    [Theory]
    [InlineData(null, "STUDENT_ID_REQUIRED")]
    [InlineData("12345", "INVALID_STUDENT_ID")]
    [InlineData("2015269123456789X", "INVALID_STUDENT_ID")]
    [InlineData("201526912345678901", "INVALID_STUDENT_ID")]
    public async Task Hold_requires_a_valid_17_digit_student_id(string? studentId, string expectedError)
    {
        var schoolClass = await _client.CreateClassAsync(5);
        var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{schoolClass.Id}/holds");
        if (studentId is not null)
            request.Headers.Add("X-Student-Id", studentId);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(expectedError, await response.ErrorCodeAsync());
    }

    [Fact]
    public async Task Unknown_ids_return_404()
    {
        var studentId = ApiClient.NewStudentId();

        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/classes/c_missing")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.HoldAsync("c_missing", studentId)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/holds/h_missing")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.ConfirmAsync("h_missing", studentId)).StatusCode);
    }
}
