using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/users")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class UsersController : ControllerBase
    {
        private static readonly HashSet<string> AllowedRoles = new() { "Administrator", "Cashier", "Waiter" };
        private readonly AppDbContext _context;
        private readonly IPasswordHasher<User> _passwordHasher;

        public UsersController(AppDbContext context, IPasswordHasher<User> passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Include(u => u.Location)
                .OrderBy(u => u.Code)
                .ToListAsync();

            return Ok(users);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] User user)
        {
            if (string.IsNullOrWhiteSpace(user.Code) || string.IsNullOrWhiteSpace(user.Name))
            {
                return BadRequest(new { message = "Error: User code and name are required." });
            }

            if (!AllowedRoles.Contains(user.Role))
            {
                return BadRequest(new { message = "Error: Invalid role specified." });
            }

            user.Code = user.Code.Trim();
            user.Name = user.Name.Trim();

            var codeExists = await _context.Users.AnyAsync(u => u.Code == user.Code);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: This user code already exists." });
            }

            if (user.Role != "Administrator" && user.LocationId == null)
            {
                return BadRequest(new { message = "Error: LocationId is required for non-Administrator roles." });
            }

            if (user.LocationId != null)
            {
                var locationExists = await _context.Locations.AnyAsync(l => l.Id == user.LocationId);
                if (!locationExists)
                {
                    return BadRequest(new { message = "Error: The specified location does not exist." });
                }
            }

            if (string.IsNullOrWhiteSpace(user.Password))
            {
                return BadRequest(new { message = "Error: Password is required." });
            }

            // El rol Administrador es global y no debe quedar atado a una sede fija
            if (user.Role == "Administrator")
            {
                user.LocationId = null;
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, user.Password);
            user.Password = null; // Limpio la contraseña en texto plano antes de guardar

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            await RecordAuditAsync($"CREATE_USER:{user.Code}");

            return Ok(new { message = "User created successfully.", user });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] User user)
        {
            if (id != user.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            if (string.IsNullOrWhiteSpace(user.Code) || string.IsNullOrWhiteSpace(user.Name))
            {
                return BadRequest(new { message = "Error: User code and name are required." });
            }

            if (!AllowedRoles.Contains(user.Role))
            {
                return BadRequest(new { message = "Error: Invalid role specified." });
            }

            var existingUser = await _context.Users.FindAsync(id);
            if (existingUser == null)
            {
                return NotFound(new { message = "Error: User not found." });
            }

            var cleanCode = user.Code.Trim();
            var codeExists = await _context.Users.AnyAsync(u => u.Code == cleanCode && u.Id != id);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: This user code already exists." });
            }

            if (user.Role != "Administrator" && user.LocationId == null)
            {
                return BadRequest(new { message = "Error: LocationId is required for non-Administrator roles." });
            }

            if (user.LocationId != null)
            {
                var locationExists = await _context.Locations.AnyAsync(l => l.Id == user.LocationId);
                if (!locationExists)
                {
                    return BadRequest(new { message = "Error: The specified location does not exist." });
                }
            }

            existingUser.Code = cleanCode;
            existingUser.Name = user.Name.Trim();
            existingUser.Role = user.Role;
            existingUser.LocationId = user.Role == "Administrator" ? null : user.LocationId;
            existingUser.Status = user.Status;

            // Solo vuelvo a generar el hash si me enviaron una contraseña nueva en el formulario
            if (!string.IsNullOrWhiteSpace(user.Password))
            {
                existingUser.PasswordHash = _passwordHasher.HashPassword(existingUser, user.Password);
            }

            await _context.SaveChangesAsync();

            await RecordAuditAsync($"UPDATE_USER:{existingUser.Code}:Status={existingUser.Status}");

            return Ok(new { message = "User updated successfully.", user = existingUser });
        }

        private async Task RecordAuditAsync(string action)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(idClaim, out int adminId))
            {
                _context.AuditRecords.Add(new AuditRecord
                {
                    Action = action,
                    Entity = "User",
                    Date = DateTime.UtcNow,
                    UserId = adminId
                });
                await _context.SaveChangesAsync();
            }
        }
    }
}
