using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/product-types")]
    [ApiController]
    [Authorize]
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
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> CreateProductType([FromBody] ProductType productType)
        {
            if (string.IsNullOrWhiteSpace(productType.Name))
            {
                return BadRequest(new { message = "Error: Product type name is required." });
            }

            productType.Name = productType.Name.Trim();

            // Evito nombres duplicados en las categorías de producto
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
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> UpdateProductType(int id, [FromBody] ProductType productType)
        {
            if (id != productType.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            if (string.IsNullOrWhiteSpace(productType.Name))
            {
                return BadRequest(new { message = "Error: Product type name is required." });
            }

            var existingType = await _context.ProductTypes.FindAsync(id);
            if (existingType == null)
            {
                return NotFound(new { message = "Error: Product type not found." });
            }

            var cleanName = productType.Name.Trim();

            // Reviso que el nuevo nombre no esté asignado a otro tipo
            var nameExists = await _context.ProductTypes.AnyAsync(t => t.Name == cleanName && t.Id != id);
            if (nameExists)
            {
                return BadRequest(new { message = "Error: This product type already exists." });
            }

            existingType.Name = cleanName;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product type updated successfully.", productType = existingType });
        }
    }
}
