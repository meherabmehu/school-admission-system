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
}
