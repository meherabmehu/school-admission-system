using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Background;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Features.Classes;
using SchoolAdmission.Api.Features.Holds;

var builder = WebApplication.CreateBuilder(args);

var connectionString = DatabaseConnectionString.Resolve(builder.Configuration);

builder.Services.AddDbContext<AdmissionDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton(AdmissionOptions.FromConfiguration(builder.Configuration));
builder.Services.AddScoped<HoldService>();
builder.Services.AddHostedService<ExpiredHoldSweeper>();

builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = true);
builder.Services.Configure<JsonOptions>(options => options.SerializerOptions.DefaultIgnoreCondition =
    System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull);

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

await DatabaseMigrator.MigrateAsync(app.Services);

app.UseJsonErrors();
app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapClassEndpoints();
app.MapHoldEndpoints();

app.Run();

public partial class Program;
