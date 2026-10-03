using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IPasswordHasher<User> passwordHasher, IConfiguration config)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _config = config;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users
                .Include(u => u.Location)
                .FirstOrDefaultAsync(u => u.Code == request.Code && u.Status);

            if (user == null)
            {
                return Unauthorized(new { message = "Error: Invalid credentials." });
            }

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new { message = "Error: Invalid credentials." });
            }

            var token = GenerateJwt(user);

            return Ok(new
            {
                message = "Login successful.",
                token,
                role = user.Role,
                locationId = user.LocationId,
                locationName = user.Location?.Name,
                name = user.Name,
            });
        }

        private string GenerateJwt(User user)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Role, user.Role),
            };

            if (user.LocationId != null)
            {
                claims.Add(new Claim("LocationId", user.LocationId.ToString()!));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class LoginRequest
    {
        public string Code { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}