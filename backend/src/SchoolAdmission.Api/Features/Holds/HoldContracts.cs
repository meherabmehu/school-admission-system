using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Features.Holds;

public record HoldResponse(
    string HoldId,
    string ClassId,
    string ClassName,
    string StudentId,
    string Status,
    DateTime ExpiresAt,
    DateTime CreatedAt,
    DateTime? ConfirmedAt,
    DateTime? CancelledAt,
    DateTime ServerTime)
{
    public static HoldResponse From(SeatHold hold, string className, DateTime now) => new(
        hold.Id,
        hold.ClassId,
        className,
        hold.StudentId,
        HoldRules.EffectiveStatus(hold.Status, hold.ExpiresAt, now),
        hold.ExpiresAt,
        hold.CreatedAt,
        hold.ConfirmedAt,
        hold.CancelledAt,
        now);
}

public static class HoldRules
{
    // A HELD row whose time is up is already expired, even if the sweeper has not updated it yet.
    public static string EffectiveStatus(string status, DateTime expiresAt, DateTime now) =>
        status == HoldStatus.Held && expiresAt <= now ? HoldStatus.Expired : status;
}
