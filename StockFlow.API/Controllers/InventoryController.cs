using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    public class InventoryEntryRequest
    {
        public int LocationId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    [Route("api/inventory")]
    [ApiController]
    public class InventoryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InventoryController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetByLocation([FromQuery] int locationId)
        {
            if (locationId <= 0)
            {
                return BadRequest(new { message = "Error: A valid locationId is required." });
            }

            var products = await _context.Products
                .Include(p => p.ProductType)
                .Include(p => p.Supplier)
                .OrderBy(p => p.Name)
                .ToListAsync();

            var locationStocks = await _context.LocationInventories
                .Where(li => li.LocationId == locationId)
                .ToListAsync();

            var result = products.Select(p =>
            {
                var stockRecord = locationStocks.FirstOrDefault(li => li.ProductId == p.Id);
                return new
                {
                    Id = stockRecord?.Id ?? 0,
                    LocationId = locationId,
                    ProductId = p.Id,
                    ProductCode = p.Code,
                    ProductName = p.Name,
                    ProductTypeName = p.ProductType?.Name ?? "—",
                    SupplierName = p.Supplier?.Name ?? "—",
                    SalePrice = p.SalePrice,
                    AvailableQuantity = stockRecord?.AvailableQuantity ?? 0
                };
            });

            return Ok(result);
        }

        [HttpPost("entry")]
        public async Task<IActionResult> RegisterEntry([FromBody] InventoryEntryRequest request)
        {
            if (request.LocationId <= 0 || request.ProductId <= 0)
            {
                return BadRequest(new { message = "Error: Valid location and product are required." });
            }

            if (request.Quantity <= 0)
            {
                return BadRequest(new { message = "Error: Entry quantity must be greater than zero." });
            }

            var locationExists = await _context.Locations.AnyAsync(l => l.Id == request.LocationId);
            if (!locationExists)
            {
                return BadRequest(new { message = "Error: The specified location does not exist." });
            }

            var productExists = await _context.Products.AnyAsync(p => p.Id == request.ProductId);
            if (!productExists)
            {
                return BadRequest(new { message = "Error: The specified product does not exist." });
            }

            // actualizamos o creamos el registro de stock para esta sede
            var inventory = await _context.LocationInventories
                .FirstOrDefaultAsync(li => li.LocationId == request.LocationId && li.ProductId == request.ProductId);

            if (inventory == null)
            {
                inventory = new LocationInventory
                {
                    LocationId = request.LocationId,
                    ProductId = request.ProductId,
                    AvailableQuantity = request.Quantity
                };
                _context.LocationInventories.Add(inventory);
            }
            else
            {
                inventory.AvailableQuantity += request.Quantity;
            }

            // Resolvemos el usuario para registrar el encabezado de auditoría/ingreso
            int? userId = null;
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("id")?.Value;
            if (int.TryParse(idClaim, out int parsedId))
            {
                userId = parsedId;
            }
            else
            {
                var fallbackUser = await _context.Users.FirstOrDefaultAsync(u => u.LocationId == request.LocationId)
                                   ?? await _context.Users.FirstOrDefaultAsync();
                userId = fallbackUser?.Id;
            }

            if (userId.HasValue)
            {
                var check = new InventoryCheck
                {
                    CheckDate = DateTime.UtcNow,
                    LocationId = request.LocationId,
                    UserId = userId.Value
                };
                _context.InventoryChecks.Add(check);
                await _context.SaveChangesAsync();

                var detail = new InventoryCheckDetail
                {
                    InventoryCheckId = check.Id,
                    ProductId = request.ProductId,
                    CountedQuantity = request.Quantity
                };
                _context.InventoryCheckDetails.Add(detail);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Inventory stock updated successfully.",
                availableQuantity = inventory.AvailableQuantity
            });
        }
    }
}