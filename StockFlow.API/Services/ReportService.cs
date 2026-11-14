using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;

namespace StockFlow.API.Services
{
    public class TransactionalReportRowDto
    {
        public string Date { get; set; } = string.Empty;
        public DateTime RawDate { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int QuantitySold { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }
        public decimal TotalSales { get; set; }
        public decimal Profit { get; set; }
        public int LocationId { get; set; }
        public string LocationName { get; set; } = string.Empty;
    }

    public class LocationSummaryKpiDto
    {
        public int LocationId { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public decimal TotalSales { get; set; }
        public decimal TotalProfit { get; set; }
        public int TotalUnitsSold { get; set; }
    }

    public class SalesReportResponseDto
    {
        public string Scope { get; set; } = string.Empty;
        public decimal GrandTotalSales { get; set; }
        public decimal GrandTotalProfit { get; set; }
        public int GrandTotalUnits { get; set; }
        public List<LocationSummaryKpiDto> LocationSummaries { get; set; } = new();
        public List<TransactionalReportRowDto> Rows { get; set; } = new();
    }

    public interface IReportService
    {
        Task<SalesReportResponseDto> GetTransactionalReportAsync(
            DateTime? startDate,
            DateTime? endDate,
            int? locationId,
            bool isAdmin);
    }

    public class ReportService : IReportService
    {
        private readonly AppDbContext _context;

        public ReportService(AppDbContext context)
        {
            _context = context;
        }

        // Genero el reporte transaccional por sede (HU-16) o consolidado de las 3 sedes (HU-07) con las columnas de HU-17
        public async Task<SalesReportResponseDto> GetTransactionalReportAsync(
            DateTime? startDate,
            DateTime? endDate,
            int? locationId,
            bool isAdmin)
        {
            var startUtc = startDate?.Date ?? DateTime.MinValue;
            var endUtc = endDate.HasValue
                ? endDate.Value.Date.AddDays(1).AddTicks(-1)
                : DateTime.MaxValue;

            var locations = await _context.Locations
                .AsNoTracking()
                .OrderBy(l => l.Id)
                .ToListAsync();

            var paymentsQuery = _context.Payments
                .AsNoTracking()
                .Include(p => p.Order)
                    .ThenInclude(o => o.Table)
                        .ThenInclude(t => t!.Location)
                .Where(p => p.Order.Status == "Closed" && p.PaymentDate >= startUtc && p.PaymentDate <= endUtc);

            if (locationId.HasValue && locationId.Value > 0)
            {
                paymentsQuery = paymentsQuery.Where(p => p.Order.Table != null && p.Order.Table.LocationId == locationId.Value);
            }

            var closedPayments = await paymentsQuery.ToListAsync();
            var orderIds = closedPayments.Select(p => p.OrderId).Distinct().ToList();

            var orderDetails = await _context.OrderDetails
                .AsNoTracking()
                .Include(d => d.Product)
                .Where(d => orderIds.Contains(d.OrderId))
                .ToListAsync();

            var paymentByOrder = closedPayments
                .GroupBy(p => p.OrderId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.PaymentDate).First());

            // Agrupo por Fecha (día), Producto y Sede para consolidar las unidades vendidas y calcular la Ganancia (HU-17)
            var rawLines = new List<TransactionalReportRowDto>();

            foreach (var detail in orderDetails)
            {
                if (!paymentByOrder.TryGetValue(detail.OrderId, out var payment) || detail.Product == null)
                {
                    continue;
                }

                var locId = payment.Order?.Table?.LocationId ?? 0;
                var locName = payment.Order?.Table?.Location?.Name ?? "Unknown";
                var saleDate = payment.PaymentDate.Date;
                var purchasePrice = detail.Product.PurchasePrice;
                var salePrice = detail.UnitPrice > 0 ? detail.UnitPrice : detail.Product.SalePrice;

                rawLines.Add(new TransactionalReportRowDto
                {
                    RawDate = saleDate,
                    Date = saleDate.ToString("yyyy-MM-dd"),
                    ProductCode = detail.Product.Code,
                    ProductName = detail.Product.Name,
                    QuantitySold = detail.Quantity,
                    PurchasePrice = purchasePrice,
                    SalePrice = salePrice,
                    TotalSales = salePrice * detail.Quantity,
                    Profit = (salePrice - purchasePrice) * detail.Quantity,
                    LocationId = locId,
                    LocationName = locName
                });
            }

            var groupedRows = rawLines
                .GroupBy(r => new { r.Date, r.RawDate, r.ProductCode, r.ProductName, r.PurchasePrice, r.SalePrice, r.LocationId, r.LocationName })
                .Select(g => new TransactionalReportRowDto
                {
                    RawDate = g.Key.RawDate,
                    Date = g.Key.Date,
                    ProductCode = g.Key.ProductCode,
                    ProductName = g.Key.ProductName,
                    QuantitySold = g.Sum(x => x.QuantitySold),
                    PurchasePrice = g.Key.PurchasePrice,
                    SalePrice = g.Key.SalePrice,
                    TotalSales = g.Sum(x => x.TotalSales),
                    Profit = g.Sum(x => x.Profit),
                    LocationId = g.Key.LocationId,
                    LocationName = g.Key.LocationName
                })
                .OrderByDescending(r => r.RawDate)
                .ThenBy(r => r.LocationName)
                .ThenBy(r => r.ProductCode)
                .ToList();

            var targetLocations = locationId.HasValue && locationId.Value > 0 && !isAdmin
                ? locations.Where(l => l.Id == locationId.Value).ToList()
                : locations;

            var locationSummaries = targetLocations.Select(loc =>
            {
                var locRows = groupedRows.Where(r => r.LocationId == loc.Id).ToList();
                return new LocationSummaryKpiDto
                {
                    LocationId = loc.Id,
                    LocationName = loc.Name,
                    TotalSales = locRows.Sum(r => r.TotalSales),
                    TotalProfit = locRows.Sum(r => r.Profit),
                    TotalUnitsSold = locRows.Sum(r => r.QuantitySold)
                };
            }).ToList();

            return new SalesReportResponseDto
            {
                Scope = isAdmin && (!locationId.HasValue || locationId.Value == 0)
                    ? "Consolidated (All 3 Locations)"
                    : locationSummaries.FirstOrDefault(l => l.LocationId == locationId)?.LocationName ?? "Location Report",
                GrandTotalSales = groupedRows.Sum(r => r.TotalSales),
                GrandTotalProfit = groupedRows.Sum(r => r.Profit),
                GrandTotalUnits = groupedRows.Sum(r => r.QuantitySold),
                LocationSummaries = locationSummaries,
                Rows = groupedRows
            };
        }
    }
}
