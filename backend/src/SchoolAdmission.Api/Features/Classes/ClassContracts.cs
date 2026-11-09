namespace SchoolAdmission.Api.Features.Classes;

public record CreateClassRequest(string? Name, int? TotalSeats);

public record ClassResponse(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats,
    DateTime CreatedAt);
