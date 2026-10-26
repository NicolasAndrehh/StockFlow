using System.Security.Claims;
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
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrdersController(AppDbContext context)
        {
            _context = context;
        }

        // Obtiene la orden activa ("Open") de una mesa específica junto con su detalle
        [HttpGet("active")]
        public async Task<IActionResult> GetActiveOrderByTable([FromQuery] int tableId)
        {
            if (tableId <= 0)
            {
                return BadRequest(new { message = "Error: A valid tableId is required." });
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

        // Guarda el pedido (crea la orden o agrega ítems a la orden abierta), descuenta stock y ocupa la mesa
        [HttpPost]
        public async Task<IActionResult> SaveOrder([FromBody] CreateOrderRequest request)
        {
            if (request.LocationId <= 0 || request.TableId <= 0)
            {
                return BadRequest(new { message = "Error: Valid location and table are required." });
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

            // Agrupamos por producto por si viene repetido en el payload
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

            // 1. Validamos existencia de productos y disponibilidad de stock en la sede
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

            // 2. Buscamos si la mesa ya tiene una orden abierta ("Open") o creamos una nueva
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.TableId == table.Id && o.Status == "Open");

            if (order == null)
            {
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

                order = new Order
                {
                    Status = "Open",
                    OpeningDate = DateTime.UtcNow,
                    TableId = table.Id,
                    UserId = userId.Value
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();
            }

            // 3. Registramos o acumulamos los detalles del pedido y descontamos del inventario de la sede
            var existingDetails = await _context.OrderDetails
                .Where(d => d.OrderId == order.Id)
                .ToListAsync();

            foreach (var item in groupedItems)
            {
                var product = products[item.ProductId];
                var inv = inventories[item.ProductId];

                // Descontamos stock
                inv.AvailableQuantity -= item.Quantity;

                var existingDetail = existingDetails.FirstOrDefault(d => d.ProductId == item.ProductId);
                if (existingDetail != null)
                {
                    existingDetail.Quantity += item.Quantity;
                    existingDetail.UnitPrice = product.SalePrice;
                }
                else
                {
                    _context.OrderDetails.Add(new OrderDetail
                    {
                        OrderId = order.Id,
                        ProductId = product.Id,
                        Quantity = item.Quantity,
                        UnitPrice = product.SalePrice
                    });
                }
            }

            // 4. Aseguramos que la mesa quede marcada como Ocupada
            table.Status = "Occupied";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Order saved successfully for Table #{table.Number}.",
                orderId = order.Id
            });
        }
    }
}