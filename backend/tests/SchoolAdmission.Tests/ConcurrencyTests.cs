using System.Net;
using System.Diagnostics;
using System.Net.Sockets;
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

    [Fact]
    public async Task Two_backend_processes_on_separate_ports_sharing_one_database_do_not_overbook()
    {
        await using var first = await BackendProcess.StartAsync(_factory.ConnectionString);
        await using var second = await BackendProcess.StartAsync(_factory.ConnectionString);
        Assert.NotEqual(first.ProcessId, second.ProcessId);

        using var firstClient = first.CreateClient();
        using var secondClient = second.CreateClient();
        var schoolClass = await firstClient.CreateClassAsync(totalSeats: 15);

        var responses = await Task.WhenAll(Enumerable.Range(0, 80)
            .Select(i => (i % 2 == 0 ? firstClient : secondClient)
                .HoldAsync(schoolClass.Id, ApiClient.NewStudentId())));

        Assert.Equal(15, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        var rejected = responses.Where(r => r.StatusCode == HttpStatusCode.Conflict).ToArray();
        Assert.Equal(65, rejected.Length);
        foreach (var response in rejected)
            Assert.Equal("NO_SEATS_AVAILABLE", await response.ErrorCodeAsync());

        var finalState = await secondClient.GetClassAsync(schoolClass.Id);
        Assert.Equal(15, finalState.HeldSeats);
        Assert.Equal(0, finalState.AvailableSeats);
    }

    private sealed class BackendProcess : IAsyncDisposable
    {
        private readonly Process _process;
        private readonly Task<string> _standardError;

        private BackendProcess(Process process, Task<string> standardError, Uri address)
        {
            _process = process;
            _standardError = standardError;
            Address = address;
        }

        public int ProcessId => _process.Id;
        private Uri Address { get; }

        public HttpClient CreateClient() => new() { BaseAddress = Address, Timeout = TimeSpan.FromSeconds(10) };

        public static async Task<BackendProcess> StartAsync(string connectionString)
        {
            var port = GetAvailablePort();
            var address = new Uri($"http://127.0.0.1:{port}");
            var apiAssembly = typeof(Program).Assembly.Location;
            var testAssembly = typeof(ConcurrencyTests).Assembly.Location;
            var runtimeConfig = Path.ChangeExtension(testAssembly, ".runtimeconfig.json");
            var depsFile = Path.ChangeExtension(testAssembly, ".deps.json");

            var startInfo = new ProcessStartInfo("dotnet")
            {
                WorkingDirectory = Path.GetDirectoryName(apiAssembly)!,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            startInfo.ArgumentList.Add("exec");
            startInfo.ArgumentList.Add("--runtimeconfig");
            startInfo.ArgumentList.Add(runtimeConfig);
            startInfo.ArgumentList.Add("--depsfile");
            startInfo.ArgumentList.Add(depsFile);
            startInfo.ArgumentList.Add(apiAssembly);
            startInfo.Environment["ConnectionStrings__Default"] = connectionString;
            startInfo.Environment["HOLD_DURATION_SECONDS"] = "600";
            startInfo.Environment["EXPIRY_SWEEP_INTERVAL_SECONDS"] = "3600";
            startInfo.Environment["ASPNETCORE_URLS"] = address.ToString();
            startInfo.Environment["Urls"] = address.ToString();

            var process = Process.Start(startInfo)
                ?? throw new InvalidOperationException("Could not start the backend process.");
            var standardError = process.StandardError.ReadToEndAsync();
            _ = process.StandardOutput.ReadToEndAsync();
            var backend = new BackendProcess(process, standardError, address);

            try
            {
                await backend.WaitUntilReadyAsync();
                return backend;
            }
            catch
            {
                await backend.DisposeAsync();
                throw;
            }
        }

        private async Task WaitUntilReadyAsync()
        {
            using var client = CreateClient();
            var deadline = DateTimeOffset.UtcNow.AddSeconds(45);
            while (DateTimeOffset.UtcNow < deadline)
            {
                if (_process.HasExited)
                    throw new InvalidOperationException(
                        $"Backend process exited with code {_process.ExitCode}: {await _standardError}");

                try
                {
                    using var response = await client.GetAsync("/health");
                    if (response.IsSuccessStatusCode)
                        return;
                }
                catch (HttpRequestException)
                {
                    // Kestrel is still starting; retry until the startup deadline.
                }

                await Task.Delay(100);
            }

            throw new TimeoutException($"Backend did not start in time: {await _standardError}");
        }

        public async ValueTask DisposeAsync()
        {
            if (!_process.HasExited)
            {
                _process.Kill(entireProcessTree: true);
                await _process.WaitForExitAsync();
            }

            _process.Dispose();
        }

        private static int GetAvailablePort()
        {
            using var listener = new TcpListener(System.Net.IPAddress.Loopback, 0);
            listener.Start();
            return ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
        }
    }
}
