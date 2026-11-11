using Npgsql;

namespace SchoolAdmission.Api.Common;

public static class DatabaseConnectionString
{
    public static string Resolve(IConfiguration configuration)
    {
        var databaseUrl = configuration["DATABASE_URL"];
        if (!string.IsNullOrWhiteSpace(databaseUrl))
            return FromUrl(databaseUrl);

        var configured = configuration.GetConnectionString("Default");
        if (!string.IsNullOrWhiteSpace(configured))
            return configured;

        throw new InvalidOperationException(
            "Configure either ConnectionStrings:Default or DATABASE_URL.");
    }

    public static string FromUrl(string databaseUrl)
    {
        if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != "postgres" && uri.Scheme != "postgresql"))
            throw new InvalidOperationException("DATABASE_URL must be a valid PostgreSQL URL.");

        var userInfo = uri.UserInfo;
        var separator = userInfo.IndexOf(':');
        var database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));
        if (separator <= 0 || separator == userInfo.Length - 1 || database.Length == 0)
            throw new InvalidOperationException("DATABASE_URL must include a database, username, and password.");

        return new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = database,
            Username = Uri.UnescapeDataString(userInfo[..separator]),
            Password = Uri.UnescapeDataString(userInfo[(separator + 1)..]),
            SslMode = SslMode.Require
        }.ConnectionString;
    }
}
