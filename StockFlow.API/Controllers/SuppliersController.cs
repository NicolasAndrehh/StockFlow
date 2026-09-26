using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/suppliers")]
    [ApiController]
    public class SuppliersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SuppliersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSuppliers()
        {
            var suppliers = await _context.Suppliers.ToListAsync();
            return Ok(suppliers);
        }

        [HttpPost]
        public async Task<IActionResult> CreateSupplier([FromBody] Supplier supplier)
        {
            // Validamos que el nombre del proveedor sea único
            var nameExists = await _context.Suppliers.AnyAsync(s => s.Name == supplier.Name);
            if (nameExists)
            {
                return BadRequest(new { message = "Error: This supplier already exists." });
            }

            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Supplier created successfully.", supplier });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSupplier(int id, [FromBody] Supplier supplier)
        {
            // Validamos que los IDs coincidan
            if (id != supplier.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            var existingSupplier = await _context.Suppliers.FindAsync(id);
            if (existingSupplier == null)
            {
                return NotFound(new { message = "Error: Supplier not found." });
            }

            // Validamos que el nuevo nombre no choque con otro proveedor ya existente
            var nameExists = await _context.Suppliers.AnyAsync(s => s.Name == supplier.Name && s.Id != id);
            if (nameExists)
            {
                return BadRequest(new { message = "Error: This supplier already exists." });
            }

            // Actualizamos los campos
            existingSupplier.Name = supplier.Name;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Supplier updated successfully.", supplier = existingSupplier });
        }
    }
}