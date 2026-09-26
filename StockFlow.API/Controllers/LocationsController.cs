using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/locations")]
    [ApiController]
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
            var locations = await _context.Locations.ToListAsync();
            return Ok(locations);
        }

        [HttpPost]
        public async Task<IActionResult> CreateLocation([FromBody] Location location)
        {
            // Validación: El código de sede debe ser único
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
        public async Task<IActionResult> UpdateLocation(int id, [FromBody] Location location)
        {
            // Validamos que el ID de la URL coincida con el ID del body
            if (id != location.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            var existingLocation = await _context.Locations.FindAsync(id);
            if (existingLocation == null)
            {
                return NotFound(new { message = "Error: Location not found." });
            }

            // Validación: El código de sede debe ser único, excepto para la ubicación actual
            var codeExists = await _context.Locations.AnyAsync(l => l.Code == location.Code && l.Id != id);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: The location code already exists in the system." });
            }
            
            existingLocation.Code = location.Code;
            existingLocation.Name = location.Name;
            existingLocation.Address = location.Address;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Location updated successfully.", location = existingLocation });
        }
    }
}