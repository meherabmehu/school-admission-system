namespace SchoolAdmission.Api.Data;

public class SchoolClass
{
    public string Id { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string NormalizedName { get; set; } = default!;
    public int TotalSeats { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<SeatHold> Holds { get; set; } = new();
}
