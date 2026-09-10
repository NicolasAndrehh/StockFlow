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

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLocation(int id, [FromBody] Sede sede)
        {
            // Validamos que el ID de la URL coincida con el ID del body
            if (id != sede.Id)
            {
                return BadRequest(new { message = "Error: El ID de la URL no coincide con el del cuerpo de la petición." });
            }

            var existingLocation = await _context.Sedes.FindAsync(id);
            if (existingLocation == null)
            {
                return NotFound(new { message = "Error: Location not found." });
            }

            // Validación: El código de sede debe ser único, excepto para la ubicación actual
            var codeExists = await _context.Sedes.AnyAsync(s => s.Codigo == sede.Codigo && s.Id != id);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: The location code already exists in the system." });
            }

            // Actualizamos los campos
            existingLocation.Codigo = sede.Codigo;
            existingLocation.Nombre = sede.Nombre;
            existingLocation.Direccion = sede.Direccion;

            // _context.Sedes.Update(existingLocation); // <-- Ya no es necesario
            await _context.SaveChangesAsync();

            return Ok(new { message = "Location updated successfully.", location = existingLocation });
        }
    }
}