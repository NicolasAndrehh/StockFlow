using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    public class OrderItemRequest
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class CreateOrderRequest
    {
        public int LocationId { get; set; }
        public int TableId { get; set; }
        public List<OrderItemRequest> Items { get; set; } = new();
    }

    [Route("api/orders")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrdersController(AppDbContext context)
        {
            _context = context;
        }

        // Consulto la orden abierta de una mesa junto con el listado de productos registrados
        [HttpGet("active")]
        public async Task<IActionResult> GetActiveOrderByTable([FromQuery] int tableId)
        {
            if (tableId <= 0)
            {
                return BadRequest(new { message = "Error: A valid tableId is required." });
            }

            var table = await _context.Tables.FindAsync(tableId);
            if (table == null)
            {
                return NotFound(new { message = "Error: Table not found." });
            }

            if (!HasLocationAccess(table.LocationId))
            {
                return StatusCode(403, new { message = "Error: You can only view orders for your assigned location." });
            }

            var activeOrder = await _context.Orders
                .Include(o => o.Table)
                .Include(o => o.User)
                .Where(o => o.TableId == tableId && o.Status == "Open")
                .OrderByDescending(o => o.OpeningDate)
                .FirstOrDefaultAsync();

            if (activeOrder == null)
            {
                return Ok(null);
            }

            var details = await _context.OrderDetails
                .Include(d => d.Product)
                .Where(d => d.OrderId == activeOrder.Id)
                .Select(d => new
                {
                    d.Id,
                    d.ProductId,
                    ProductCode = d.Product != null ? d.Product.Code : "",
                    ProductName = d.Product != null ? d.Product.Name : "Product",
                    d.Quantity,
                    d.UnitPrice,
                    Subtotal = d.Quantity * d.UnitPrice
                })
                .ToListAsync();

            return Ok(new
            {
                activeOrder.Id,
                activeOrder.Status,
                activeOrder.OpeningDate,
                activeOrder.TableId,
                TableNumber = activeOrder.Table?.Number ?? 0,
                WaiterName = activeOrder.User?.Name ?? "Staff",
                Details = details,
                Total = details.Sum(d => d.Subtotal)
            });
        }

        // Guardo el pedido sobre una mesa libre, descuento el stock de la sede y marco la mesa como ocupada
        [HttpPost]
        [Authorize(Roles = "Administrator,Waiter")]
        public async Task<IActionResult> SaveOrder([FromBody] CreateOrderRequest request)
        {
            if (request.LocationId <= 0 || request.TableId <= 0)
            {
                return BadRequest(new { message = "Error: Valid location and table are required." });
            }

            if (!HasLocationAccess(request.LocationId))
            {
                return StatusCode(403, new { message = "Error: You can only register orders for your assigned location." });
            }

            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { message = "Error: The order must contain at least one product." });
            }

            var table = await _context.Tables
                .FirstOrDefaultAsync(t => t.Id == request.TableId && t.LocationId == request.LocationId);

            if (table == null)
            {
                return BadRequest(new { message = "Error: The selected table does not belong to the active location." });
            }

            // Según HU-08, solo permito iniciar un pedido nuevo sobre una mesa que esté libre
            if (table.Status != "Available")
            {
                return BadRequest(new { message = $"Error: Table #{table.Number} is currently occupied. New orders can only be started on an available table." });
            }

            // Agrupo por producto en caso de que el mismo ítem venga repetido en la solicitud
            var groupedItems = request.Items
                .GroupBy(i => i.ProductId)
                .Select(g => new { ProductId = g.Key, Quantity = g.Sum(x => x.Quantity) })
                .ToList();

            if (groupedItems.Any(i => i.Quantity <= 0))
            {
                return BadRequest(new { message = "Error: Product quantities must be greater than zero." });
            }

            var productIds = groupedItems.Select(i => i.ProductId).ToList();

            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            var inventories = await _context.LocationInventories
                .Where(li => li.LocationId == request.LocationId && productIds.Contains(li.ProductId))
                .ToDictionaryAsync(li => li.ProductId);

            // Verifico que todos los productos existan y tengan stock suficiente en la sede actual
            foreach (var item in groupedItems)
            {
                if (!products.TryGetValue(item.ProductId, out var product))
                {
                    return BadRequest(new { message = $"Error: Product ID {item.ProductId} does not exist." });
                }

                if (!inventories.TryGetValue(item.ProductId, out var inv) || inv.AvailableQuantity < item.Quantity)
                {
                    var available = inv?.AvailableQuantity ?? 0;
                    return BadRequest(new
                    {
                        message = $"Error: Insufficient stock for '{product.Name}'. Available: {available}, Requested: {item.Quantity}."
                    });
                }
            }

            int? userId = null;
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("id")?.Value;
            if (int.TryParse(idClaim, out int parsedId))
            {
                userId = parsedId;
            }
            else
            {
                var fallbackUser = await _context.Users.FirstOrDefaultAsync(u => u.LocationId == request.LocationId && u.Role == "Waiter")
                                   ?? await _context.Users.FirstOrDefaultAsync(u => u.LocationId == request.LocationId)
                                   ?? await _context.Users.FirstOrDefaultAsync();
                userId = fallbackUser?.Id;
            }

            if (!userId.HasValue)
            {
                return BadRequest(new { message = "Error: No valid user found to assign the order." });
            }

            // Creo la orden en estado Abierto hasta que el Cajero realice el cierre
            var order = new Order
            {
                Status = "Open",
                OpeningDate = DateTime.UtcNow,
                TableId = table.Id,
                UserId = userId.Value
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // Registro cada detalle del pedido y descuento las unidades del inventario de la sede
            foreach (var item in groupedItems)
            {
                var product = products[item.ProductId];
                var inv = inventories[item.ProductId];

                inv.AvailableQuantity -= item.Quantity;

                _context.OrderDetails.Add(new OrderDetail
                {
                    OrderId = order.Id,
                    ProductId = product.Id,
                    Quantity = item.Quantity,
                    UnitPrice = product.SalePrice
                });
            }

            // Paso la mesa automáticamente a estado Ocupada (HU-08 / HU-11)
            table.Status = "Occupied";

            _context.AuditRecords.Add(new AuditRecord
            {
                Action = $"CREATE_ORDER:Order={order.Id}:Table={table.Number}:Loc={request.LocationId}",
                Entity = "Order",
                Date = DateTime.UtcNow,
                UserId = userId.Value
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Order #{order.Id} saved for Table #{table.Number}. Status is now Open and table is Occupied.",
                orderId = order.Id
            });
        }

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
    }
}
