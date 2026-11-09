using Microsoft.AspNetCore.Diagnostics;
using Npgsql;

namespace SchoolAdmission.Api.Common;

public static class ErrorHandling
{
    // Turns unhandled exceptions into the same JSON error shape the endpoints use,
    // so the UI never has to deal with an empty or HTML error body.
    public static void UseJsonErrors(this WebApplication app)
    {
        app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

            var (status, error) = exception switch
            {
                BadHttpRequestException => (StatusCodes.Status400BadRequest,
                    new ApiError("INVALID_REQUEST", "The request body is missing or is not valid JSON.")),
                NpgsqlException or TimeoutException => (StatusCodes.Status503ServiceUnavailable,
                    new ApiError("DATABASE_UNAVAILABLE", "The database is not reachable right now. Please try again shortly.")),
                _ => (StatusCodes.Status500InternalServerError,
                    new ApiError("INTERNAL_ERROR", "Something went wrong on the server."))
            };

            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(error);
        }));
    }
}
