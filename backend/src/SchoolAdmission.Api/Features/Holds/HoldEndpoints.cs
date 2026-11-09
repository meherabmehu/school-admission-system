using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Features.Holds;

public static class HoldEndpoints
{
    public static void MapHoldEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes/{classId}/holds", CreateHold);
        app.MapGet("/holds/{holdId}", GetHold);
        app.MapPost("/holds/{holdId}/confirm", ConfirmHold);
        app.MapDelete("/holds/{holdId}", CancelHold);
        app.MapGet("/me/holds", ListMyHolds);
    }

    private static async Task<IResult> CreateHold(
        string classId, HttpContext context, HoldService holds, TimeProvider clock, CancellationToken ct)
    {
        if (!StudentIdHeader.TryRead(context, out var studentId, out var error))
            return error!;

        var result = await holds.CreateHoldAsync(classId, studentId, ct);

        return result.Outcome switch
        {
            HoldOutcome.Success => Results.Created(
                $"/holds/{result.Hold!.Id}",
                HoldResponse.From(result.Hold, result.ClassName!, clock.GetUtcNow().UtcDateTime)),
            HoldOutcome.ClassNotFound => ApiErrors.NotFound("CLASS_NOT_FOUND", "Class not found."),
            HoldOutcome.AlreadyApplied => ApiErrors.Conflict(
                "ALREADY_APPLIED", "This student already has an active application for this class.", result.ExistingHoldId),
            _ => ApiErrors.Conflict("NO_SEATS_AVAILABLE", "No seats are available in this class right now.")
        };
    }

    private static async Task<IResult> GetHold(string holdId, AdmissionDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var row = await db.Holds.AsNoTracking()
            .Where(h => h.Id == holdId)
            .Select(h => new { Hold = h, ClassName = h.Class.Name })
            .FirstOrDefaultAsync(ct);

        return row is null
            ? ApiErrors.NotFound("HOLD_NOT_FOUND", "Application not found.")
            : Results.Ok(HoldResponse.From(row.Hold, row.ClassName, clock.GetUtcNow().UtcDateTime));
    }

    private static async Task<IResult> ConfirmHold(
        string holdId, HttpContext context, HoldService holds, AdmissionDbContext db, TimeProvider clock, CancellationToken ct)
    {
        if (!StudentIdHeader.TryRead(context, out var studentId, out var error))
            return error!;

        var result = await holds.ConfirmAsync(holdId, studentId, ct);
        if (result.Outcome != HoldChangeOutcome.Success)
            return ChangeError(result.Outcome);

        var className = await db.Classes.Where(c => c.Id == result.Hold!.ClassId).Select(c => c.Name).FirstAsync(ct);
        return Results.Ok(HoldResponse.From(result.Hold!, className, clock.GetUtcNow().UtcDateTime));
    }

    private static async Task<IResult> CancelHold(string holdId, HttpContext context, HoldService holds, CancellationToken ct)
    {
        if (!StudentIdHeader.TryRead(context, out var studentId, out var error))
            return error!;

        var result = await holds.CancelAsync(holdId, studentId, ct);
        return result.Outcome == HoldChangeOutcome.Success ? Results.NoContent() : ChangeError(result.Outcome);
    }

    private static async Task<IResult> ListMyHolds(HttpContext context, AdmissionDbContext db, TimeProvider clock, CancellationToken ct)
    {
        if (!StudentIdHeader.TryRead(context, out var studentId, out var error))
            return error!;

        var now = clock.GetUtcNow().UtcDateTime;
        var rows = await db.Holds.AsNoTracking()
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAt)
            .Select(h => new { Hold = h, ClassName = h.Class.Name })
            .ToListAsync(ct);

        return Results.Ok(rows.Select(r => HoldResponse.From(r.Hold, r.ClassName, now)));
    }

    private static IResult ChangeError(HoldChangeOutcome outcome) => outcome switch
    {
        HoldChangeOutcome.NotFound => ApiErrors.NotFound("HOLD_NOT_FOUND", "Application not found."),
        HoldChangeOutcome.NotOwner => ApiErrors.Forbidden("NOT_YOUR_HOLD", "This application belongs to a different student."),
        HoldChangeOutcome.Expired => ApiErrors.Conflict("HOLD_EXPIRED", "The time limit for this application has passed."),
        HoldChangeOutcome.Cancelled => ApiErrors.Conflict("HOLD_CANCELLED", "This application has been cancelled."),
        HoldChangeOutcome.AlreadyConfirmed => ApiErrors.Conflict("ALREADY_CONFIRMED", "Admission is already confirmed and cannot be cancelled."),
        _ => throw new ArgumentOutOfRangeException(nameof(outcome))
    };
}
