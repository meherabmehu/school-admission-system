using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace SchoolAdmission.Api.Data;

public static class DatabaseMigrator
{
    private const long MigrationLockKey = 7_302_026;

    // Several backend instances may start at the same time, so migrations run under
    // a Postgres advisory lock. Retries cover the database still starting up.
    public static async Task MigrateAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DatabaseMigrator));

        var lockConnectionString = new NpgsqlConnectionStringBuilder(db.Database.GetConnectionString())
        {
            Database = "postgres",
            Pooling = false
        }.ConnectionString;

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await using var lockConnection = new NpgsqlConnection(lockConnectionString);
                await lockConnection.OpenAsync(ct);
                await using (var cmd = new NpgsqlCommand($"SELECT pg_advisory_lock({MigrationLockKey})", lockConnection))
                {
                    await cmd.ExecuteNonQueryAsync(ct);
                }

                await db.Database.MigrateAsync(ct);
                logger.LogInformation("Database is up to date");
                return;
            }
            catch (Exception ex) when (attempt < 30 && ex is NpgsqlException or TimeoutException)
            {
                logger.LogWarning("Database not ready yet (attempt {Attempt}): {Message}", attempt, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(2), ct);
            }
        }
    }
}
