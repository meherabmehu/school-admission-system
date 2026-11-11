using Microsoft.Extensions.Configuration;
using Npgsql;
using SchoolAdmission.Api.Common;

namespace SchoolAdmission.Tests;

public class DatabaseConnectionStringTests
{
    [Fact]
    public void Render_postgres_url_is_converted_to_an_ssl_npgsql_connection_string()
    {
        var connectionString = DatabaseConnectionString.FromUrl(
            "postgresql://admission:p%40ss%3Aword@db.example.com:5432/school_admission");
        var parsed = new NpgsqlConnectionStringBuilder(connectionString);

        Assert.Equal("db.example.com", parsed.Host);
        Assert.Equal(5432, parsed.Port);
        Assert.Equal("school_admission", parsed.Database);
        Assert.Equal("admission", parsed.Username);
        Assert.Equal("p@ss:word", parsed.Password);
        Assert.Equal(SslMode.Require, parsed.SslMode);
    }

    [Fact]
    public void Database_url_takes_precedence_over_the_local_default_connection_string()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Database=local;Username=local",
                ["DATABASE_URL"] = "postgresql://admission:secret@db.example.com/school_admission"
            })
            .Build();

        var resolved = new NpgsqlConnectionStringBuilder(DatabaseConnectionString.Resolve(configuration));

        Assert.Equal("db.example.com", resolved.Host);
        Assert.Equal("school_admission", resolved.Database);
        Assert.Equal("admission", resolved.Username);
    }
}
