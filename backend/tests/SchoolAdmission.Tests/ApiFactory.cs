using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;

namespace SchoolAdmission.Tests;

// Runs the real API in memory against a real Postgres database. Every factory gets its
// own throwaway database unless it is given an existing connection string to share.
public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly bool _ownsDatabase;

    public ApiFactory(string? sharedConnectionString = null, string instanceName = "tests")
    {
        _ownsDatabase = sharedConnectionString is null;
        var builder = new NpgsqlConnectionStringBuilder(sharedConnectionString ?? BaseConnectionString());
        if (_ownsDatabase)
            builder.Database = "admission_test_" + Guid.NewGuid().ToString("N")[..12];
        builder.ApplicationName = instanceName;
        builder.MaxPoolSize = 50;
        ConnectionString = builder.ConnectionString;
    }

    public string ConnectionString { get; }

    public TestClock Clock { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", ConnectionString);
        builder.UseSetting("HOLD_DURATION_SECONDS", "600");
        builder.UseSetting("EXPIRY_SWEEP_INTERVAL_SECONDS", "3600");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        if (!_ownsDatabase)
            return;

        NpgsqlConnection.ClearAllPools();
        var admin = new NpgsqlConnectionStringBuilder(ConnectionString) { Database = "postgres", Pooling = false };
        await using var connection = new NpgsqlConnection(admin.ConnectionString);
        await connection.OpenAsync();
        var databaseName = new NpgsqlConnectionStringBuilder(ConnectionString).Database;
        await using var cmd = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{databaseName}\" WITH (FORCE)", connection);
        await cmd.ExecuteNonQueryAsync();
    }

    private static string BaseConnectionString() =>
        Environment.GetEnvironmentVariable("TEST_DB_CONNECTION")
        ?? "Host=localhost;Port=5432;Username=admission;Password=admission;Database=postgres";
}

public class TestClock : TimeProvider
{
    private TimeSpan _offset = TimeSpan.Zero;

    public override DateTimeOffset GetUtcNow() => base.GetUtcNow() + _offset;

    public void Advance(TimeSpan by) => _offset += by;
}
