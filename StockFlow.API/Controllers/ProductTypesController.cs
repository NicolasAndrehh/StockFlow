using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/product-types")]
    [ApiController]
    public class ProductTypesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductTypesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProductTypes()
        {
            var types = await _context.ProductTypes
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    AssociatedProducts = t.Products.Count()
                })
                .ToListAsync();

            return Ok(types);
        }

        [HttpPost]
        public async Task<IActionResult> CreateProductType([FromBody] ProductType productType)
        {
            // Validamos que el nombre no se repita
            var nameExists = await _context.ProductTypes.AnyAsync(t => t.Name == productType.Name);
            if (nameExists)
            {
                return BadRequest(new { message = "Error: This product type already exists." });
            }

            _context.ProductTypes.Add(productType);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product type created successfully.", productType });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProductType(int id, [FromBody] ProductType productType)
        {
            // Validamos que los IDs coincidan
            if (id != productType.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            var existingType = await _context.ProductTypes.FindAsync(id);
            if (existingType == null)
            {
                return NotFound(new { message = "Error: Product type not found." });
            }

            // Validamos que el nuevo nombre no choque con otro ya existente
            var nameExists = await _context.ProductTypes.AnyAsync(t => t.Name == productType.Name && t.Id != id);
            if (nameExists)
            {
                return BadRequest(new { message = "Error: This product type already exists." });
            }

            existingType.Name = productType.Name;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product type updated successfully.", productType = existingType });
        }
    }
}