using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Background;

// Marks overdue holds as EXPIRED so the stored status matches reality without anyone
// calling the API. Seat counts never depend on this job (they check expires_at directly),
// and the UPDATE is idempotent, so it is safe to run in several backend processes at once.
public class ExpiredHoldSweeper(
    IServiceScopeFactory scopeFactory,
    TimeProvider clock,
    AdmissionOptions options,
    ILogger<ExpiredHoldSweeper> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(options.ExpirySweepInterval, clock);

        do
        {
            try
            {
                var expired = await SweepOnceAsync(stoppingToken);
                if (expired > 0)
                    logger.LogInformation("Released {Count} expired seat hold(s)", expired);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Expired hold sweep failed; will retry");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public async Task<int> SweepOnceAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
        var now = clock.GetUtcNow().UtcDateTime;

        return await db.Holds
            .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.Expired), ct);
    }
}
