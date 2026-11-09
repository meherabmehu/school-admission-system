using SchoolAdmission.Api.Common;

namespace SchoolAdmission.Api.Features.Holds;

public static class HoldEndpoints
{
    public static void MapHoldEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes/{classId}/holds", CreateHold);
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
}
