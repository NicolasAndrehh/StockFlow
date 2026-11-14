using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/suppliers")]
    [ApiController]
    [Authorize]
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
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> CreateSupplier([FromBody] Supplier supplier)
        {
            if (string.IsNullOrWhiteSpace(supplier.Name))
            {
                return BadRequest(new { message = "Error: Supplier name is required." });
            }

            supplier.Name = supplier.Name.Trim();

            // Verifico que el nombre del proveedor no esté repetido
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
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> UpdateSupplier(int id, [FromBody] Supplier supplier)
        {
            if (id != supplier.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            if (string.IsNullOrWhiteSpace(supplier.Name))
            {
                return BadRequest(new { message = "Error: Supplier name is required." });
            }

            var existingSupplier = await _context.Suppliers.FindAsync(id);
            if (existingSupplier == null)
            {
                return NotFound(new { message = "Error: Supplier not found." });
            }

            var cleanName = supplier.Name.Trim();

            // Reviso que el nombre no choque con otro proveedor registrado
            var nameExists = await _context.Suppliers.AnyAsync(s => s.Name == cleanName && s.Id != id);
            if (nameExists)
            {
                return BadRequest(new { message = "Error: This supplier already exists." });
            }

            existingSupplier.Name = cleanName;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Supplier updated successfully.", supplier = existingSupplier });
        }
    }
}
