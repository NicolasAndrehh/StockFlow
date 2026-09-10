using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/product-types")]
    [ApiController]
    public class TiposProductoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TiposProductoController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProductTypes()
        {
            var tipos = await _context.TiposProducto.ToListAsync();
            return Ok(tipos);
        }

        [HttpPost]
        public async Task<IActionResult> CreateProductType([FromBody] TipoProducto tipo)
        {
            // Validamos que el nombre no se repita
            var nameExists = await _context.TiposProducto.AnyAsync(t => t.Nombre == tipo.Nombre);
            if (nameExists)
            {
                return BadRequest(new { message = "Error: Ese tipo de producto ya existe." });
            }

            _context.TiposProducto.Add(tipo);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Type created successfully.", tipo });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProductType(int id, [FromBody] TipoProducto tipo)
        {
            if (id != tipo.Id)
            {
                return BadRequest(new { message = "Error: El ID de la URL no coincide con el del cuerpo." });
            }

            var existingType = await _context.TiposProducto.FindAsync(id);
            if (existingType == null)
            {
                return NotFound(new { message = "Error: Tipo de producto no encontrado." });
            }

            // Validamos que el nuevo nombre no choque con otro ya existente
            var nameExists = await _context.TiposProducto.AnyAsync(t => t.Nombre == tipo.Nombre && t.Id != id);
            if (nameExists)
            {
                return BadRequest(new { message = "Error: Ese tipo de producto ya existe." });
            }

            existingType.Nombre = tipo.Nombre;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Type updated successfully.", tipo = existingType });
        }
    }
}