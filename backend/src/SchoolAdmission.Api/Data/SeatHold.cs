namespace SchoolAdmission.Api.Data;

public class SeatHold
{
    public string Id { get; set; } = default!;
    public string ClassId { get; set; } = default!;
    public SchoolClass Class { get; set; } = default!;
    public string StudentId { get; set; } = default!;
    public string Status { get; set; } = HoldStatus.Held;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
}

public static class HoldStatus
{
    public const string Held = "HELD";
    public const string Confirmed = "CONFIRMED";
    public const string Expired = "EXPIRED";
    public const string Cancelled = "CANCELLED";
}
