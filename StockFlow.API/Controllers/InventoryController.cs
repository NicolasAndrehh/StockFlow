using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
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

    public class InventoryCheckItemRequest
    {
        public int ProductId { get; set; }
        public int CountedQuantity { get; set; }
    }

    public class FullInventoryCheckRequest
    {
        public int LocationId { get; set; }
        public List<InventoryCheckItemRequest> Items { get; set; } = new();
    }

    [Route("api/inventory")]
    [ApiController]
    [Authorize]
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

            if (!HasLocationAccess(locationId))
            {
                return StatusCode(403, new { message = "Error: You can only view inventory for your assigned location." });
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

        // Registro de chequeo completo por sede (HU-15)
        [HttpPost("full-check")]
        [Authorize(Roles = "Administrator,Cashier")]
        public async Task<IActionResult> RegisterFullCheck([FromBody] FullInventoryCheckRequest request)
        {
            if (request.LocationId <= 0)
            {
                return BadRequest(new { message = "Error: A valid location is required." });
            }

            if (!HasLocationAccess(request.LocationId))
            {
                return StatusCode(403, new { message = "Error: You can only register inventory for your assigned location." });
            }

            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { message = "Error: Full inventory check requires at least one product count." });
            }

            if (request.Items.Any(i => i.CountedQuantity < 0))
            {
                return BadRequest(new { message = "Error: Counted quantities cannot be negative." });
            }

            var locationExists = await _context.Locations.AnyAsync(l => l.Id == request.LocationId);
            if (!locationExists)
            {
                return BadRequest(new { message = "Error: The specified location does not exist." });
            }

            var allProductIds = await _context.Products.Select(p => p.Id).ToListAsync();
            var productIdSet = allProductIds.ToHashSet();

            if (request.Items.Any(i => !productIdSet.Contains(i.ProductId)))
            {
                return BadRequest(new { message = "Error: One or more products in the check do not exist." });
            }

            var userId = await ResolveCurrentUserIdAsync(request.LocationId);
            if (!userId.HasValue)
            {
                return BadRequest(new { message = "Error: Could not resolve user performing the inventory check." });
            }

            // Creo el encabezado del chequeo completo de la sede
            var check = new InventoryCheck
            {
                CheckDate = DateTime.UtcNow,
                LocationId = request.LocationId,
                UserId = userId.Value
            };
            _context.InventoryChecks.Add(check);
            await _context.SaveChangesAsync();

            var existingStocks = await _context.LocationInventories
                .Where(li => li.LocationId == request.LocationId)
                .ToDictionaryAsync(li => li.ProductId);

            // Actualizo el stock disponible de la sede con el conteo físico y guardo el detalle del chequeo
            foreach (var item in request.Items)
            {
                if (existingStocks.TryGetValue(item.ProductId, out var stockRecord))
                {
                    stockRecord.AvailableQuantity = item.CountedQuantity;
                }
                else
                {
                    _context.LocationInventories.Add(new LocationInventory
                    {
                        LocationId = request.LocationId,
                        ProductId = item.ProductId,
                        AvailableQuantity = item.CountedQuantity
                    });
                }

                _context.InventoryCheckDetails.Add(new InventoryCheckDetail
                {
                    InventoryCheckId = check.Id,
                    ProductId = item.ProductId,
                    CountedQuantity = item.CountedQuantity
                });
            }

            _context.AuditRecords.Add(new AuditRecord
            {
                Action = $"FULL_INVENTORY_CHECK:Loc={request.LocationId}:Items={request.Items.Count}",
                Entity = "InventoryCheck",
                Date = DateTime.UtcNow,
                UserId = userId.Value
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Full inventory check completed for {request.Items.Count} products.",
                checkId = check.Id
            });
        }

        [HttpPost("entry")]
        [Authorize(Roles = "Administrator,Cashier")]
        public async Task<IActionResult> RegisterEntry([FromBody] InventoryEntryRequest request)
        {
            if (request.LocationId <= 0 || request.ProductId <= 0)
            {
                return BadRequest(new { message = "Error: Valid location and product are required." });
            }

            if (!HasLocationAccess(request.LocationId))
            {
                return StatusCode(403, new { message = "Error: You can only register inventory for your assigned location." });
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

            // Busco el registro de inventario de este producto en la sede o lo inicializo
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

            var userId = await ResolveCurrentUserIdAsync(request.LocationId);
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

        // Valido que un Cajero o Mesero solo opere sobre su propia sede asignada en el token
        private bool HasLocationAccess(int requestedLocationId)
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role == "Administrator")
            {
                return true;
            }

            var locationClaim = User.FindFirst("LocationId")?.Value;
            return int.TryParse(locationClaim, out int userLocationId) && userLocationId == requestedLocationId;
        }

        private async Task<int?> ResolveCurrentUserIdAsync(int locationId)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("id")?.Value;
            if (int.TryParse(idClaim, out int parsedId))
            {
                return parsedId;
            }

            var fallbackUser = await _context.Users.FirstOrDefaultAsync(u => u.LocationId == locationId)
                               ?? await _context.Users.FirstOrDefaultAsync();
            return fallbackUser?.Id;
        }
    }
}
