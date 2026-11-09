using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Features.Holds;

public enum HoldOutcome
{
    Success,
    ClassNotFound,
    NoSeatsAvailable,
    AlreadyApplied
}

public record CreateHoldResult(HoldOutcome Outcome, SeatHold? Hold = null, string? ClassName = null, string? ExistingHoldId = null);

public enum HoldChangeOutcome
{
    Success,
    NotFound,
    NotOwner,
    Expired,
    Cancelled,
    AlreadyConfirmed
}

public record HoldChangeResult(HoldChangeOutcome Outcome, SeatHold? Hold = null);

public class HoldService(AdmissionDbContext db, TimeProvider clock, AdmissionOptions options)
{
    // The class row is locked with SELECT ... FOR UPDATE, so every hold request for the
    // same class is serialized inside Postgres. Because the lock lives in the database,
    // this also holds when several backend processes share the same database.
    public async Task<CreateHoldResult> CreateHoldAsync(string classId, string studentId, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var schoolClass = (await db.Classes
            .FromSql($"SELECT * FROM classes WHERE id = {classId} FOR UPDATE")
            .ToListAsync(ct)).FirstOrDefault();

        if (schoolClass is null)
            return new CreateHoldResult(HoldOutcome.ClassNotFound);

        var now = clock.GetUtcNow().UtcDateTime;

        await db.Holds
            .Where(h => h.ClassId == classId && h.Status == HoldStatus.Held && h.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.Expired), ct);

        var existingHoldId = await db.Holds
            .Where(h => h.ClassId == classId && h.StudentId == studentId &&
                        (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed))
            .Select(h => h.Id)
            .FirstOrDefaultAsync(ct);

        if (existingHoldId is not null)
            return new CreateHoldResult(HoldOutcome.AlreadyApplied, ExistingHoldId: existingHoldId);

        var takenSeats = await db.Holds.CountAsync(
            h => h.ClassId == classId && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed), ct);

        if (takenSeats >= schoolClass.TotalSeats)
            return new CreateHoldResult(HoldOutcome.NoSeatsAvailable);

        var hold = new SeatHold
        {
            Id = IdGenerator.NewHoldId(),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.Held,
            CreatedAt = now,
            ExpiresAt = now + options.HoldDuration
        };
        db.Holds.Add(hold);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return new CreateHoldResult(HoldOutcome.AlreadyApplied);
        }

        await transaction.CommitAsync(ct);
        return new CreateHoldResult(HoldOutcome.Success, hold, schoolClass.Name);
    }

    // Confirming does not change how many seats are taken (a HELD seat simply becomes
    // CONFIRMED), so only the hold row itself needs to be locked. The lock makes a
    // repeated or parallel confirm of the same hold count only once.
    public async Task<HoldChangeResult> ConfirmAsync(string holdId, string studentId, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var hold = await LockHoldAsync(holdId, ct);
        if (hold is null)
            return new HoldChangeResult(HoldChangeOutcome.NotFound);
        if (hold.StudentId != studentId)
            return new HoldChangeResult(HoldChangeOutcome.NotOwner);

        var now = clock.GetUtcNow().UtcDateTime;
        var outcome = await ExpireIfDueAsync(hold, now, ct);
        if (outcome is not null)
        {
            await transaction.CommitAsync(ct);
            return new HoldChangeResult(outcome.Value, hold);
        }

        if (hold.Status == HoldStatus.Confirmed)
            return new HoldChangeResult(HoldChangeOutcome.Success, hold);

        hold.Status = HoldStatus.Confirmed;
        hold.ConfirmedAt = now;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new HoldChangeResult(HoldChangeOutcome.Success, hold);
    }

    // Only a live HELD application can be cancelled. Cancelling twice is treated as success.
    public async Task<HoldChangeResult> CancelAsync(string holdId, string studentId, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var hold = await LockHoldAsync(holdId, ct);
        if (hold is null)
            return new HoldChangeResult(HoldChangeOutcome.NotFound);
        if (hold.StudentId != studentId)
            return new HoldChangeResult(HoldChangeOutcome.NotOwner);

        if (hold.Status == HoldStatus.Cancelled)
            return new HoldChangeResult(HoldChangeOutcome.Success, hold);
        if (hold.Status == HoldStatus.Confirmed)
            return new HoldChangeResult(HoldChangeOutcome.AlreadyConfirmed, hold);

        var now = clock.GetUtcNow().UtcDateTime;
        var outcome = await ExpireIfDueAsync(hold, now, ct);
        if (outcome is not null)
        {
            await transaction.CommitAsync(ct);
            return new HoldChangeResult(outcome.Value, hold);
        }

        hold.Status = HoldStatus.Cancelled;
        hold.CancelledAt = now;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new HoldChangeResult(HoldChangeOutcome.Success, hold);
    }

    private async Task<SeatHold?> LockHoldAsync(string holdId, CancellationToken ct) =>
        (await db.Holds
            .FromSql($"SELECT * FROM seat_holds WHERE id = {holdId} FOR UPDATE")
            .ToListAsync(ct)).FirstOrDefault();

    private async Task<HoldChangeOutcome?> ExpireIfDueAsync(SeatHold hold, DateTime now, CancellationToken ct)
    {
        if (hold.Status == HoldStatus.Cancelled)
            return HoldChangeOutcome.Cancelled;
        if (hold.Status == HoldStatus.Expired)
            return HoldChangeOutcome.Expired;
        if (hold.Status == HoldStatus.Held && hold.ExpiresAt <= now)
        {
            hold.Status = HoldStatus.Expired;
            await db.SaveChangesAsync(ct);
            return HoldChangeOutcome.Expired;
        }
        return null;
    }
}
