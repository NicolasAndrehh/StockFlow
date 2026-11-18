#nullable enable
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Services
{
    public class OrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class InvoiceLineDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal { get; set; }
    }

    public class ActiveOrderDto
    {
        public int Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime OpeningDate { get; set; }
        public int TableId { get; set; }
        public int TableNumber { get; set; }
        public string WaiterName { get; set; } = string.Empty;
        public List<InvoiceLineDto> Details { get; set; } = new();
        public decimal Total { get; set; }
    }

    public class LocationOrderSummaryDto
    {
        public int Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime OpeningDate { get; set; }
        public int TableId { get; set; }
        public int TableNumber { get; set; }
        public int LocationId { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string WaiterName { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public string? PaymentMethod { get; set; }
        public string? InvoiceNumber { get; set; }
        public List<InvoiceLineDto> Details { get; set; } = new();
    }

    public class CheckoutResultDto
    {
        public int OrderId { get; set; }
        public int TableNumber { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string WaiterName { get; set; } = string.Empty;
        public string CashierName { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime IssuedDate { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal TotalPaid { get; set; }
        public List<InvoiceLineDto> Items { get; set; } = new();
        public List<CashDenominationDto> CashBreakdown { get; set; } = new();
    }

    public interface IOrderBillingService
    {
        Task<ActiveOrderDto?> GetActiveOrderByTableAsync(int tableId);

        Task<List<LocationOrderSummaryDto>> GetOrdersByLocationAsync(int locationId);

        Task<(bool Success, string Message, int? OrderId)> CreateOrderAsync(
            int locationId,
            int tableId,
            int userId,
            List<OrderItemDto> items);

        Task<(bool Success, string Message, CheckoutResultDto? Invoice)> CheckoutOrderAsync(
            int orderId,
            int cashierUserId,
            string paymentMethod);

        Task<CheckoutResultDto?> GetInvoiceByOrderIdAsync(int orderId);
    }

    public class OrderBillingService : IOrderBillingService
    {
        private static readonly HashSet<string> AllowedPaymentMethods = new()
        {
            "Cash",
            "Credit Card",
            "Debit Card"
        };

        private readonly AppDbContext _context;

        public OrderBillingService(AppDbContext context)
        {
            _context = context;
        }

        // Consulto la orden abierta de una mesa específica con su detalle de productos (HU-11)
        public async Task<ActiveOrderDto?> GetActiveOrderByTableAsync(int tableId)
        {
            var activeOrder = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Table)
                .Include(o => o.User)
                .Where(o => o.TableId == tableId && o.Status == "Open")
                .OrderByDescending(o => o.OpeningDate)
                .FirstOrDefaultAsync();

            if (activeOrder == null)
            {
                return null;
            }

            var details = await _context.OrderDetails
                .AsNoTracking()
                .Include(d => d.Product)
                .Where(d => d.OrderId == activeOrder.Id)
                .Select(d => new InvoiceLineDto
                {
                    Id = d.Id,
                    ProductId = d.ProductId,
                    ProductCode = d.Product != null ? d.Product.Code : "",
                    ProductName = d.Product != null ? d.Product.Name : "Product",
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    Subtotal = d.Quantity * d.UnitPrice
                })
                .ToListAsync();

            return new ActiveOrderDto
            {
                Id = activeOrder.Id,
                Status = activeOrder.Status,
                OpeningDate = activeOrder.OpeningDate,
                TableId = activeOrder.TableId,
                TableNumber = activeOrder.Table?.Number ?? 0,
                WaiterName = activeOrder.User?.Name ?? "Staff",
                Details = details,
                Total = details.Sum(d => d.Subtotal)
            };
        }

        // Listo las órdenes de una sede poniendo primero las abiertas para el cierre de pedidos del Cajero (HU-12)
        public async Task<List<LocationOrderSummaryDto>> GetOrdersByLocationAsync(int locationId)
        {
            var orders = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Table)
                    .ThenInclude(t => t!.Location)
                .Include(o => o.User)
                .Where(o => o.Table != null && o.Table.LocationId == locationId)
                .OrderBy(o => o.Status == "Open" ? 0 : 1)
                .ThenByDescending(o => o.OpeningDate)
                .Take(40)
                .ToListAsync();

            if (orders.Count == 0)
            {
                return new List<LocationOrderSummaryDto>();
            }

            var orderIds = orders.Select(o => o.Id).ToList();

            var allDetails = await _context.OrderDetails
                .AsNoTracking()
                .Include(d => d.Product)
                .Where(d => orderIds.Contains(d.OrderId))
                .ToListAsync();

            var payments = await _context.Payments
                .AsNoTracking()
                .Where(p => orderIds.Contains(p.OrderId))
                .ToListAsync();

            var paymentIds = payments.Select(p => p.Id).ToList();
            var invoices = await _context.Invoices
                .AsNoTracking()
                .Where(i => paymentIds.Contains(i.PaymentId))
                .ToListAsync();

            var detailsByOrder = allDetails
                .GroupBy(d => d.OrderId)
                .ToDictionary(g => g.Key, g => g.Select(d => new InvoiceLineDto
                {
                    Id = d.Id,
                    ProductId = d.ProductId,
                    ProductCode = d.Product?.Code ?? "",
                    ProductName = d.Product?.Name ?? "Product",
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    Subtotal = d.Quantity * d.UnitPrice
                }).ToList());

            var paymentByOrder = payments
                .GroupBy(p => p.OrderId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.PaymentDate).First());

            var invoiceByPayment = invoices
                .GroupBy(i => i.PaymentId)
                .ToDictionary(g => g.Key, g => g.First());

            return orders.Select(o =>
            {
                var lines = detailsByOrder.TryGetValue(o.Id, out var dList) ? dList : new List<InvoiceLineDto>();
                paymentByOrder.TryGetValue(o.Id, out var pay);
                Invoice? inv = null;
                if (pay != null)
                {
                    invoiceByPayment.TryGetValue(pay.Id, out inv);
                }

                return new LocationOrderSummaryDto
                {
                    Id = o.Id,
                    Status = o.Status,
                    OpeningDate = o.OpeningDate,
                    TableId = o.TableId,
                    TableNumber = o.Table?.Number ?? 0,
                    LocationId = o.Table?.LocationId ?? locationId,
                    LocationName = o.Table?.Location?.Name ?? "Location",
                    WaiterName = o.User?.Name ?? "Waiter",
                    Total = lines.Sum(x => x.Subtotal),
                    PaymentMethod = pay?.PaymentMethod,
                    InvoiceNumber = inv?.InvoiceNumber,
                    Details = lines
                };
            }).ToList();
        }

        // Registro el pedido dentro de una transacción atómica para garantizar concurrencia <= 2s (HU-08 a HU-11 y HU-21)
        public async Task<(bool Success, string Message, int? OrderId)> CreateOrderAsync(
            int locationId,
            int tableId,
            int userId,
            List<OrderItemDto> items)
        {
            if (items == null || items.Count == 0)
            {
                return (false, "Error: The order must contain at least one product.", null);
            }

            var groupedItems = items
                .GroupBy(i => i.ProductId)
                .Select(g => new OrderItemDto { ProductId = g.Key, Quantity = g.Sum(x => x.Quantity) })
                .ToList();

            if (groupedItems.Any(i => i.Quantity <= 0))
            {
                return (false, "Error: Product quantities must be greater than zero.", null);
            }

            // Ejecuto la transacción manual dentro de la estrategia de reintentos de EF Core MySQL para evitar errores 500 con MySqlRetryingExecutionStrategy
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<(bool Success, string Message, int? OrderId)>(async () =>
            {
                _context.ChangeTracker.Clear();
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var table = await _context.Tables
                        .FirstOrDefaultAsync(t => t.Id == tableId && t.LocationId == locationId);

                    if (table == null)
                    {
                        return (false, "Error: The selected table does not belong to the active location.", null);
                    }

                    // Solo permito iniciar un pedido si la mesa se encuentra en estado Libre (HU-08)
                    if (table.Status != "Available")
                    {
                        return (false, $"Error: Table #{table.Number} is currently occupied. New orders can only be started on an available table.", null);
                    }

                    var productIds = groupedItems.Select(i => i.ProductId).ToList();

                    var products = await _context.Products
                        .AsNoTracking()
                        .Where(p => productIds.Contains(p.Id))
                        .ToDictionaryAsync(p => p.Id);

                    var inventories = await _context.LocationInventories
                        .Where(li => li.LocationId == locationId && productIds.Contains(li.ProductId))
                        .ToDictionaryAsync(li => li.ProductId);

                    foreach (var item in groupedItems)
                    {
                        if (!products.TryGetValue(item.ProductId, out var product))
                        {
                            return (false, $"Error: Product ID {item.ProductId} does not exist.", null);
                        }

                        if (!inventories.TryGetValue(item.ProductId, out var inv) || inv.AvailableQuantity < item.Quantity)
                        {
                            var available = inv?.AvailableQuantity ?? 0;
                            return (false, $"Error: Insufficient stock for '{product.Name}'. Available: {available}, Requested: {item.Quantity}.", null);
                        }
                    }

                    var effectiveUserId = userId;
                    if (effectiveUserId <= 0)
                    {
                        var fallbackUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.LocationId == locationId && u.Role == "Waiter")
                                           ?? await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.LocationId == locationId)
                                           ?? await _context.Users.AsNoTracking().FirstOrDefaultAsync();
                        effectiveUserId = fallbackUser?.Id ?? 1;
                    }

                    var order = new Order
                    {
                        Status = "Open",
                        OpeningDate = DateTime.UtcNow,
                        TableId = table.Id,
                        UserId = effectiveUserId
                    };

                    _context.Orders.Add(order);
                    await _context.SaveChangesAsync();

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

                    // Marco la mesa como Ocupada automáticamente al guardar el pedido (HU-08 y HU-11)
                    table.Status = "Occupied";

                    _context.AuditRecords.Add(new AuditRecord
                    {
                        Action = $"CREATE_ORDER:Order={order.Id}:Table={table.Number}:Loc={locationId}",
                        Entity = "Order",
                        Date = DateTime.UtcNow,
                        UserId = effectiveUserId
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return (true, $"Order #{order.Id} saved for Table #{table.Number}. Status is Open and table is now Occupied.", order.Id);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // Cierro el pedido, registro el pago único sin recargo, libero la mesa y genero la factura física (HU-12, HU-13, HU-14)
        public async Task<(bool Success, string Message, CheckoutResultDto? Invoice)> CheckoutOrderAsync(
            int orderId,
            int cashierUserId,
            string paymentMethod)
        {
            if (string.IsNullOrWhiteSpace(paymentMethod) || !AllowedPaymentMethods.Contains(paymentMethod.Trim()))
            {
                return (false, "Error: Payment method must be 'Cash', 'Credit Card', or 'Debit Card'. Combined payments are not allowed.", null);
            }

            var cleanMethod = paymentMethod.Trim();

            // Ejecuto la transacción de cierre y facturación dentro de la estrategia de reintentos de EF Core MySQL para evitar errores 500
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<(bool Success, string Message, CheckoutResultDto? Invoice)>(async () =>
            {
                _context.ChangeTracker.Clear();
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var order = await _context.Orders
                        .Include(o => o.Table)
                            .ThenInclude(t => t!.Location)
                        .Include(o => o.User)
                        .FirstOrDefaultAsync(o => o.Id == orderId);

                    if (order == null)
                    {
                        return (false, "Error: Order not found.", null);
                    }

                    if (order.Status != "Open")
                    {
                        return (false, $"Error: Order #{order.Id} is already closed.", null);
                    }

                    var details = await _context.OrderDetails
                        .AsNoTracking()
                        .Include(d => d.Product)
                        .Where(d => d.OrderId == order.Id)
                        .ToListAsync();

                    if (details.Count == 0)
                    {
                        return (false, "Error: Cannot close an order without registered products.", null);
                    }

                    // Calculo el total exacto sin recargos por medio de pago (HU-13)
                    var exactTotal = details.Sum(d => d.Quantity * d.UnitPrice);
                    var now = DateTime.UtcNow;

                    var payment = new Payment
                    {
                        OrderId = order.Id,
                        UserId = cashierUserId,
                        PaymentMethod = cleanMethod,
                        AmountPaid = exactTotal,
                        PaymentDate = now
                    };

                    _context.Payments.Add(payment);
                    await _context.SaveChangesAsync();

                    var invoiceNumber = $"INV-{order.Id:D4}-{payment.Id:D4}";
                    var invoice = new Invoice
                    {
                        PaymentId = payment.Id,
                        InvoiceNumber = invoiceNumber,
                        IssuedDate = now
                    };

                    _context.Invoices.Add(invoice);

                    // Paso el pedido a Cerrado y libero la mesa para nuevos clientes (HU-12)
                    order.Status = "Closed";
                    if (order.Table != null)
                    {
                        order.Table.Status = "Available";
                    }

                    _context.AuditRecords.Add(new AuditRecord
                    {
                        Action = $"CLOSE_ORDER:Order={order.Id}:Method={cleanMethod}:Total={exactTotal}",
                        Entity = "Invoice",
                        Date = now,
                        UserId = cashierUserId
                    });

                    var cashier = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == cashierUserId);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Si el pago fue en Efectivo, ejecuto el Algoritmo Voraz para desglosar la combinación mínima de billetes/monedas COP en la factura física (HU-13 / HU-14)
                    var cashBreakdown = cleanMethod == "Cash"
                        ? StockFlowAlgorithms.ComputeGreedyCashBreakdown(payment.AmountPaid)
                        : new List<CashDenominationDto>();

                    var dto = new CheckoutResultDto
                    {
                        OrderId = order.Id,
                        TableNumber = order.Table?.Number ?? 0,
                        LocationName = order.Table?.Location?.Name ?? "Location",
                        WaiterName = order.User?.Name ?? "Waiter",
                        CashierName = cashier?.Name ?? "Cashier",
                        InvoiceNumber = invoice.InvoiceNumber,
                        IssuedDate = invoice.IssuedDate,
                        PaymentMethod = payment.PaymentMethod,
                        TotalPaid = payment.AmountPaid,
                        Items = details.Select(d => new InvoiceLineDto
                        {
                            Id = d.Id,
                            ProductId = d.ProductId,
                            ProductCode = d.Product?.Code ?? "",
                            ProductName = d.Product?.Name ?? "Product",
                            Quantity = d.Quantity,
                            UnitPrice = d.UnitPrice,
                            Subtotal = d.Quantity * d.UnitPrice
                        }).ToList(),
                        CashBreakdown = cashBreakdown
                    };

                    return (true, $"Order #{order.Id} closed and physical invoice {invoice.InvoiceNumber} generated.", dto);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // Consulto los datos de la factura física de un pedido ya cerrado para visualizarla o reimprimirla (HU-14)
        public async Task<CheckoutResultDto?> GetInvoiceByOrderIdAsync(int orderId)
        {
            var order = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Table)
                    .ThenInclude(t => t!.Location)
                .Include(o => o.User)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                return null;
            }

            var payment = await _context.Payments
                .AsNoTracking()
                .Include(p => p.User)
                .Where(p => p.OrderId == order.Id)
                .OrderByDescending(p => p.PaymentDate)
                .FirstOrDefaultAsync();

            if (payment == null)
            {
                return null;
            }

            var invoice = await _context.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.PaymentId == payment.Id);

            var details = await _context.OrderDetails
                .AsNoTracking()
                .Include(d => d.Product)
                .Where(d => d.OrderId == order.Id)
                .ToListAsync();

            // Si la factura se pagó en Efectivo, calculo el desglose óptimo de billetes/monedas COP con mi Algoritmo Voraz (HU-13 / HU-14)
            var cashBreakdown = payment.PaymentMethod == "Cash"
                ? StockFlowAlgorithms.ComputeGreedyCashBreakdown(payment.AmountPaid)
                : new List<CashDenominationDto>();

            return new CheckoutResultDto
            {
                OrderId = order.Id,
                TableNumber = order.Table?.Number ?? 0,
                LocationName = order.Table?.Location?.Name ?? "Location",
                WaiterName = order.User?.Name ?? "Waiter",
                CashierName = payment.User?.Name ?? "Cashier",
                InvoiceNumber = invoice?.InvoiceNumber ?? $"INV-{order.Id:D4}",
                IssuedDate = invoice?.IssuedDate ?? payment.PaymentDate,
                PaymentMethod = payment.PaymentMethod,
                TotalPaid = payment.AmountPaid,
                Items = details.Select(d => new InvoiceLineDto
                {
                    Id = d.Id,
                    ProductId = d.ProductId,
                    ProductCode = d.Product?.Code ?? "",
                    ProductName = d.Product?.Name ?? "Product",
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    Subtotal = d.Quantity * d.UnitPrice
                }).ToList(),
                CashBreakdown = cashBreakdown
            };
        }
    }
}
