namespace SchoolAdmission.Api.Common;

public static class StudentIdHeader
{
    public const string Name = "X-Student-Id";
    public const int Length = 17;

    // Birth registration numbers in Bangladesh are exactly 17 digits.
    public static bool TryRead(HttpContext context, out string studentId, out IResult? error)
    {
        studentId = context.Request.Headers[Name].ToString().Trim();
        error = null;

        if (studentId.Length == 0)
        {
            error = ApiErrors.BadRequest("STUDENT_ID_REQUIRED", $"The {Name} header is required.");
            return false;
        }

        if (studentId.Length != Length || !studentId.All(char.IsAsciiDigit))
        {
            error = ApiErrors.BadRequest("INVALID_STUDENT_ID", $"{Name} must be a {Length}-digit birth registration number.");
            return false;
        }

        return true;
    }
}
