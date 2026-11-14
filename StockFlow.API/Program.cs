using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using StockFlow.API.Data;
using StockFlow.API.Models;
using StockFlow.API.Services;

var builder = WebApplication.CreateBuilder(args);

var envConn = Environment.GetEnvironmentVariable("MYSQL_CONNECTION_STRING")
              ?? Environment.GetEnvironmentVariable("MYSQL_URL")
              ?? Environment.GetEnvironmentVariable("DATABASE_URL");
var configConn = builder.Configuration.GetConnectionString("DefaultConnection");

var rawConnectionString = !string.IsNullOrWhiteSpace(envConn)
    ? envConn
    : !string.IsNullOrWhiteSpace(configConn)
        ? configConn
        : "Server=localhost;Port=3306;Database=StockFlowDB;Uid=root;Pwd=Nicolas2010;";

// Permito tanto cadenas ADO.NET estándar como URLs mysql:// de proveedores cloud (Railway, Clever Cloud, Aiven, TiDB)
var connectionString = NormalizeMySqlConnectionString(rawConnectionString);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        connectionString,
        new MySqlServerVersion(new Version(8, 0, 0)),
        mySqlOptions => mySqlOptions.EnableRetryOnFailure(3)
    )
    .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddOpenApi();
builder.Services.AddControllers();

// Orígenes que habilito en CORS para pruebas locales y despliegue del Front en Vercel/Render
var allowedOrigins = builder.Configuration["AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries)
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
                origin.StartsWith("http://localhost:") ||
                origin.EndsWith(".vercel.app") ||
                origin.EndsWith(".onrender.com") ||
                origin.EndsWith(".railway.app") ||
                origin.EndsWith(".netlify.app") ||
                allowedOrigins.Contains(origin))
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configuración de JWT para manejar la sesión y validar roles por sede
var jwtKey = builder.Configuration["Jwt:Key"] ?? "StockFlow-Super-Secret-Key-2026-Minimum-32-Characters";
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "StockFlow.API",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "StockFlow.UI",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

// Inyecto mi capa de servicios de negocio para facturación y reportes (Sprints 7, 8 y 9)
builder.Services.AddScoped<IOrderBillingService, OrderBillingService>();
builder.Services.AddScoped<IReportService, ReportService>();

var app = builder.Build();

// Aplico migraciones y cargo los datos semilla al levantar la API en local o en Render
await DbSeeder.SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpsRedirection();
}

app.UseCors("AllowReact");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new { status = "StockFlow API is running", timestamp = DateTime.UtcNow }));
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapControllers();

app.Run();

// Convierto automáticamente URLs mysql://user:pass@host:port/db al formato ADO.NET si se pega la URI directa del proveedor cloud
static string NormalizeMySqlConnectionString(string input)
{
    var trimmed = input.Trim();
    if (!trimmed.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase) &&
        !trimmed.StartsWith("mysqls://", StringComparison.OrdinalIgnoreCase))
    {
        return trimmed;
    }

    var uri = new Uri(trimmed);
    var userInfo = uri.UserInfo.Split(':', 2);
    var user = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var database = uri.AbsolutePath.Trim('/');
    var port = uri.Port > 0 ? uri.Port : 3306;

    return $"Server={uri.Host};Port={port};Database={database};Uid={user};Pwd={password};SslMode=Preferred;";
}
