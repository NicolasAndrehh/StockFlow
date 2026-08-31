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
            var locations = await _context.Sedes.ToListAsync();
            return Ok(locations);
        }

        [HttpPost]
        public async Task<IActionResult> CreateLocation([FromBody] Sede sede)
        {
            // Validación: El código de sede debe ser único
            var codeExists = await _context.Sedes.AnyAsync(s => s.Codigo == sede.Codigo);
            
            if (codeExists)
            {
                return BadRequest(new { message = "Error: The location code already exists in the system." });
            }

            _context.Sedes.Add(sede);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Location created successfully.", location = sede });
        }
    }
}