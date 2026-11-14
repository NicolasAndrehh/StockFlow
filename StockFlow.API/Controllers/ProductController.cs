using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    [Route("api/products")]
    [ApiController]
    [Authorize]
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
                .OrderBy(p => p.Name)
                .ToListAsync();

            return Ok(products);
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> CreateProduct([FromBody] Product product)
        {
            if (string.IsNullOrWhiteSpace(product.Code) || string.IsNullOrWhiteSpace(product.Name))
            {
                return BadRequest(new { message = "Error: Product code and name are required." });
            }

            product.Code = product.Code.Trim();
            product.Name = product.Name.Trim();

            // Aseguro que los precios sean positivos y que el precio de venta deje margen sobre el de compra
            if (product.PurchasePrice <= 0 || product.SalePrice <= 0)
            {
                return BadRequest(new { message = "Error: Purchase price and sale price must be greater than zero." });
            }

            if (product.PurchasePrice >= product.SalePrice)
            {
                return BadRequest(new { message = "Error: Purchase price must be strictly less than the sale price to ensure a profit margin." });
            }

            // Verifico que el código del producto no exista ya en el catálogo
            var codeExists = await _context.Products.AnyAsync(p => p.Code == product.Code);
            if (codeExists)
            {
                return BadRequest(new { message = "Error: A product with this code already exists." });
            }

            // Confirmo que el tipo de producto y el proveedor estén registrados
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

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product created successfully.", product });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product product)
        {
            if (id != product.Id)
            {
                return BadRequest(new { message = "Error: The URL ID does not match the request body ID." });
            }

            if (string.IsNullOrWhiteSpace(product.Code) || string.IsNullOrWhiteSpace(product.Name))
            {
                return BadRequest(new { message = "Error: Product code and name are required." });
            }

            // Valido precios y rentabilidad antes de actualizar
            if (product.PurchasePrice <= 0 || product.SalePrice <= 0)
            {
                return BadRequest(new { message = "Error: Purchase price and sale price must be greater than zero." });
            }

            if (product.PurchasePrice >= product.SalePrice)
            {
                return BadRequest(new { message = "Error: Purchase price must be strictly less than the sale price to ensure a profit margin." });
            }

            var existingProduct = await _context.Products.FindAsync(id);
            if (existingProduct == null)
            {
                return NotFound(new { message = "Error: Product not found." });
            }

            var cleanCode = product.Code.Trim();
            var codeExists = await _context.Products.AnyAsync(p => p.Code == cleanCode && p.Id != id);
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

            existingProduct.Code = cleanCode;
            existingProduct.Name = product.Name.Trim();
            existingProduct.ProductTypeId = product.ProductTypeId;
            existingProduct.SupplierId = product.SupplierId;
            existingProduct.PurchasePrice = product.PurchasePrice;
            existingProduct.SalePrice = product.SalePrice;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Product updated successfully.", product = existingProduct });
        }
    }
}
