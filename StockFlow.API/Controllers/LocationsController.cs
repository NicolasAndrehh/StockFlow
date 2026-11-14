using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/locations")]
    [ApiController]
    [Authorize]
    public class LocationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LocationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetLocations()
        {
            var locations = await _context.Locations
                .OrderBy(l => l.Code)
                .ToListAsync();
            return Ok(locations);
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> CreateLocation([FromBody] Location location)
        {
            if (string.IsNullOrWhiteSpace(location.Code) ||
                string.IsNullOrWhiteSpace(location.Name) ||
                string.IsNullOrWhiteSpace(location.Address))
            {
                return BadRequest(new { message = "Error: Code, name, and address are required." });
            }

            location.Code = location.Code.Trim();
            location.Name = location.Name.Trim();
            location.Address = location.Address.Trim();

            // Verifico que el código de la sede no esté repetido
            var codeExists = await _context.Locations.AnyAsync(l => l.Code == location.Code);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: The location code already exists in the system." });
            }

            _context.Locations.Add(location);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Location created successfully.", location });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> UpdateLocation(int id, [FromBody] Location location)
        {
            if (id != location.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            if (string.IsNullOrWhiteSpace(location.Code) ||
                string.IsNullOrWhiteSpace(location.Name) ||
                string.IsNullOrWhiteSpace(location.Address))
            {
                return BadRequest(new { message = "Error: Code, name, and address are required." });
            }

            var existingLocation = await _context.Locations.FindAsync(id);
            if (existingLocation == null)
            {
                return NotFound(new { message = "Error: Location not found." });
            }

            var cleanCode = location.Code.Trim();

            // Valido que el código sea único excluyendo la sede que estoy editando
            var codeExists = await _context.Locations.AnyAsync(l => l.Code == cleanCode && l.Id != id);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: The location code already exists in the system." });
            }

            existingLocation.Code = cleanCode;
            existingLocation.Name = location.Name.Trim();
            existingLocation.Address = location.Address.Trim();

            await _context.SaveChangesAsync();

            return Ok(new { message = "Location updated successfully.", location = existingLocation });
        }
    }
}
