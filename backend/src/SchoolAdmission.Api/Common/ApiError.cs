namespace SchoolAdmission.Api.Common;

public record ApiError(string Error, string Message, string? HoldId = null);

public static class ApiErrors
{
    public static IResult BadRequest(string code, string message) =>
        Results.Json(new ApiError(code, message), statusCode: StatusCodes.Status400BadRequest);

    public static IResult NotFound(string code, string message) =>
        Results.Json(new ApiError(code, message), statusCode: StatusCodes.Status404NotFound);

    public static IResult Forbidden(string code, string message) =>
        Results.Json(new ApiError(code, message), statusCode: StatusCodes.Status403Forbidden);

    public static IResult Conflict(string code, string message, string? holdId = null) =>
        Results.Json(new ApiError(code, message, holdId), statusCode: StatusCodes.Status409Conflict);
}
