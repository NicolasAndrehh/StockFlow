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
                .ToListAsync();

            return Ok(users);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] User user)
        {
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

            if (string.IsNullOrEmpty(user.Password))
            {
                return BadRequest(new { message = "Error: Password is required." });
            }

            // Administrator no tiene sede asociada
            if (user.Role == "Administrator")
            {
                user.LocationId = null;
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, user.Password);
            user.Password = null; // limpiamos el texto plano antes de persistir

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User created successfully.", user });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] User user)
        {
            if (id != user.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            var existingUser = await _context.Users.FindAsync(id);
            if (existingUser == null)
            {
                return NotFound(new { message = "Error: User not found." });
            }

            var codeExists = await _context.Users.AnyAsync(u => u.Code == user.Code && u.Id != id);
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

            existingUser.Code = user.Code;
            existingUser.Name = user.Name;
            existingUser.Role = user.Role;
            existingUser.LocationId = user.Role == "Administrator" ? null : user.LocationId;
            existingUser.Status = user.Status;

            // Solo re-hashea si mandaron una contraseña nueva
            if (!string.IsNullOrEmpty(user.Password))
            {
                existingUser.PasswordHash = _passwordHasher.HashPassword(existingUser, user.Password);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "User updated successfully.", user = existingUser });
        }
    }
}