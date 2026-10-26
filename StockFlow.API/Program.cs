using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StockFlow.API.Data;
using StockFlow.API.Models;

var builder = WebApplication.CreateBuilder(args);
var envConn = Environment.GetEnvironmentVariable("MYSQL_CONNECTION_STRING");
var configConn = builder.Configuration.GetConnectionString("DefaultConnection");

var connectionString = !string.IsNullOrWhiteSpace(envConn)
    ? envConn
    : !string.IsNullOrWhiteSpace(configConn)
        ? configConn
        : "Server=localhost;Port=3306;Database=StockFlowDB;Uid=root;Pwd=Nicolas2010;";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        connectionString,
        new MySqlServerVersion(new Version(8, 0, 0))
    ));

builder.Services.AddOpenApi();
builder.Services.AddControllers();

// Permite localhost y el dominio donde despliegues el frontend
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

// --- Autenticación JWT ---
var jwtKey = builder.Configuration["Jwt:Key"]!;
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
// --- Fin autenticación JWT ---

var app = builder.Build();

// Ejecuta migraciones y semillas automáticamente al iniciar el servidor
await DbSeeder.SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowReact");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();