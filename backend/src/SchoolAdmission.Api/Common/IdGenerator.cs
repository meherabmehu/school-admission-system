using System.Security.Cryptography;

namespace SchoolAdmission.Api.Common;

public static class IdGenerator
{
    private const string Alphabet = "abcdefghijkmnpqrstuvwxyz23456789";

    public static string NewClassId() => "c_" + RandomString(10);

    public static string NewHoldId() => "h_" + RandomString(12);

    private static string RandomString(int length) =>
        RandomNumberGenerator.GetString(Alphabet, length);
}
