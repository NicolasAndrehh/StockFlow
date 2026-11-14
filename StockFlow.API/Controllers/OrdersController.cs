#nullable enable
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Services;

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

    public class CheckoutOrderRequest
    {
        public string PaymentMethod { get; set; } = "Cash";
    }

    [Route("api/orders")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IOrderBillingService _orderBillingService;

        public OrdersController(AppDbContext context, IOrderBillingService orderBillingService)
        {
            _context = context;
            _orderBillingService = orderBillingService;
        }

        // Consulto la orden abierta de una mesa junto con el listado de productos registrados
        [HttpGet("active")]
        public async Task<IActionResult> GetActiveOrderByTable([FromQuery] int tableId)
        {
            if (tableId <= 0)
            {
                return BadRequest(new { message = "Error: A valid tableId is required." });
            }

            var table = await _context.Tables
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == tableId);

            if (table == null)
            {
                return NotFound(new { message = "Error: Table not found." });
            }

            if (!HasLocationAccess(table.LocationId))
            {
                return StatusCode(403, new { message = "Error: You can only view orders for your assigned location." });
            }

            var activeOrder = await _orderBillingService.GetActiveOrderByTableAsync(tableId);
            return Ok(activeOrder);
        }

        // Consulto todas las órdenes de una sede para la pantalla de cierre de pedidos del Cajero (HU-12)
        [HttpGet("location")]
        [Authorize(Roles = "Administrator,Cashier")]
        public async Task<IActionResult> GetOrdersByLocation([FromQuery] int locationId)
        {
            if (locationId <= 0)
            {
                return BadRequest(new { message = "Error: A valid locationId is required." });
            }

            if (!HasLocationAccess(locationId))
            {
                return StatusCode(403, new { message = "Error: You can only view orders for your assigned location." });
            }

            var orders = await _orderBillingService.GetOrdersByLocationAsync(locationId);
            return Ok(orders);
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

            var userId = ResolveCurrentUserId();
            var items = (request.Items ?? new List<OrderItemRequest>())
                .Select(i => new OrderItemDto { ProductId = i.ProductId, Quantity = i.Quantity })
                .ToList();

            var (success, message, orderId) = await _orderBillingService.CreateOrderAsync(
                request.LocationId,
                request.TableId,
                userId,
                items);

            if (!success)
            {
                return BadRequest(new { message });
            }

            return Ok(new
            {
                message,
                orderId
            });
        }

        // Cierro el pedido, registro el medio de pago único sin recargos y genero la factura física (HU-12, HU-13, HU-14)
        [HttpPost("{id}/checkout")]
        [Authorize(Roles = "Administrator,Cashier")]
        public async Task<IActionResult> CheckoutOrder(int id, [FromBody] CheckoutOrderRequest request)
        {
            var order = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Table)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null || order.Table == null)
            {
                return NotFound(new { message = "Error: Order not found." });
            }

            if (!HasLocationAccess(order.Table.LocationId))
            {
                return StatusCode(403, new { message = "Error: You can only close orders belonging to your assigned location." });
            }

            var userId = ResolveCurrentUserId();
            if (userId <= 0)
            {
                var fallback = await _context.Users.AsNoTracking().FirstOrDefaultAsync();
                userId = fallback?.Id ?? 1;
            }

            var (success, message, invoice) = await _orderBillingService.CheckoutOrderAsync(
                id,
                userId,
                request.PaymentMethod);

            if (!success)
            {
                return BadRequest(new { message });
            }

            return Ok(new
            {
                message,
                invoice
            });
        }

        // Consulto la factura física no electrónica de un pedido cerrado para mostrarla o imprimirla (HU-14)
        [HttpGet("{id}/invoice")]
        [Authorize(Roles = "Administrator,Cashier")]
        public async Task<IActionResult> GetInvoiceByOrder(int id)
        {
            var order = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Table)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null || order.Table == null)
            {
                return NotFound(new { message = "Error: Order not found." });
            }

            if (!HasLocationAccess(order.Table.LocationId))
            {
                return StatusCode(403, new { message = "Error: You can only view invoices for your assigned location." });
            }

            var invoice = await _orderBillingService.GetInvoiceByOrderIdAsync(id);
            if (invoice == null)
            {
                return NotFound(new { message = "Error: Invoice not found for this order." });
            }

            return Ok(invoice);
        }

        private int ResolveCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("id")?.Value;
            return int.TryParse(idClaim, out int parsedId) ? parsedId : 0;
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
