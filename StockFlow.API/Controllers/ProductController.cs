using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/products")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _context.Products
                .Include(p => p.ProductType)
                .Include(p => p.Supplier)
                .ToListAsync();

            return Ok(products);
        }

        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] Product product)
        {
            // Validamos que el código sea único
            var codeExists = await _context.Products.AnyAsync(p => p.Code == product.Code);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: A product with this code already exists." });
            }

            // Validamos que el tipo de producto exista
            var typeExists = await _context.ProductTypes.AnyAsync(t => t.Id == product.ProductTypeId);
            if (!typeExists)
            {
                return BadRequest(new { message = "Error: The specified product type does not exist." });
            }

            // Validamos que el proveedor exista
            var supplierExists = await _context.Suppliers.AnyAsync(s => s.Id == product.SupplierId);
            if (!supplierExists)
            {
                return BadRequest(new { message = "Error: The specified supplier does not exist." });
            }

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product created successfully.", product });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product product)
        {
            if (id != product.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            var existingProduct = await _context.Products.FindAsync(id);
            if (existingProduct == null)
            {
                return NotFound(new { message = "Error: Product not found." });
            }

            var codeExists = await _context.Products.AnyAsync(p => p.Code == product.Code && p.Id != id);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: A product with this code already exists." });
            }

            var typeExists = await _context.ProductTypes.AnyAsync(t => t.Id == product.ProductTypeId);
            if (!typeExists)
            {
                return BadRequest(new { message = "Error: The specified product type does not exist." });
            }

            var supplierExists = await _context.Suppliers.AnyAsync(s => s.Id == product.SupplierId);
            if (!supplierExists)
            {
                return BadRequest(new { message = "Error: The specified supplier does not exist." });
            }

            existingProduct.Code = product.Code;
            existingProduct.Name = product.Name;
            existingProduct.ProductTypeId = product.ProductTypeId;
            existingProduct.SupplierId = product.SupplierId;
            existingProduct.SalePrice = product.SalePrice;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Product updated successfully.", product = existingProduct });
        }
    }
}