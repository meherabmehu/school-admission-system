using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Features.Classes;

public static class ClassEndpoints
{
    public const int MaxNameLength = 100;
    public const int MaxSeats = 10_000;

    public static void MapClassEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/classes");
        group.MapPost("/", CreateClass);
        group.MapGet("/", ListClasses);
        group.MapGet("/{classId}", GetClass);
    }

    private static async Task<IResult> CreateClass(
        CreateClassRequest? request, AdmissionDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var name = request?.Name?.Trim() ?? "";
        if (name.Length == 0)
            return ApiErrors.BadRequest("VALIDATION_ERROR", "Class name is required.");
        if (name.Length > MaxNameLength)
            return ApiErrors.BadRequest("VALIDATION_ERROR", $"Class name must be at most {MaxNameLength} characters.");
        if (request?.TotalSeats is not int totalSeats)
            return ApiErrors.BadRequest("VALIDATION_ERROR", "Total seats is required.");
        if (totalSeats < 1 || totalSeats > MaxSeats)
            return ApiErrors.BadRequest("VALIDATION_ERROR", $"Total seats must be between 1 and {MaxSeats}.");

        var normalizedName = NormalizeName(name);
        if (await db.Classes.AnyAsync(c => c.NormalizedName == normalizedName, ct))
            return ApiErrors.Conflict("CLASS_ALREADY_EXISTS", "A class with this name already exists.");

        var schoolClass = new SchoolClass
        {
            Id = IdGenerator.NewClassId(),
            Name = name,
            NormalizedName = normalizedName,
            TotalSeats = totalSeats,
            CreatedAt = clock.GetUtcNow().UtcDateTime
        };
        db.Classes.Add(schoolClass);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return ApiErrors.Conflict("CLASS_ALREADY_EXISTS", "A class with this name already exists.");
        }

        var response = new ClassResponse(schoolClass.Id, schoolClass.Name, totalSeats, 0, 0, totalSeats, schoolClass.CreatedAt);
        return Results.Created($"/classes/{schoolClass.Id}", response);
    }

    private static async Task<IResult> ListClasses(AdmissionDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var classes = await QuerySummaries(db.Classes.OrderBy(c => c.CreatedAt), clock).ToListAsync(ct);
        return Results.Ok(classes);
    }

    private static async Task<IResult> GetClass(string classId, AdmissionDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var schoolClass = await QuerySummaries(db.Classes.Where(c => c.Id == classId), clock).FirstOrDefaultAsync(ct);
        return schoolClass is null
            ? ApiErrors.NotFound("CLASS_NOT_FOUND", "Class not found.")
            : Results.Ok(schoolClass);
    }

    // Held seats only count while the hold is still within its time limit, so the
    // numbers are correct even before the background sweeper marks a hold as expired.
    private static IQueryable<ClassResponse> QuerySummaries(IQueryable<SchoolClass> classes, TimeProvider clock)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        return classes
            .AsNoTracking()
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.TotalSeats,
                c.CreatedAt,
                Held = c.Holds.Count(h => h.Status == HoldStatus.Held && h.ExpiresAt > now),
                Confirmed = c.Holds.Count(h => h.Status == HoldStatus.Confirmed)
            })
            .Select(c => new ClassResponse(
                c.Id,
                c.Name,
                c.TotalSeats,
                c.Held,
                c.Confirmed,
                c.TotalSeats - c.Held - c.Confirmed,
                c.CreatedAt));
    }

    private static string NormalizeName(string name) =>
        string.Join(' ', name.Split(' ', StringSplitOptions.RemoveEmptyEntries)).ToUpperInvariant();
}
