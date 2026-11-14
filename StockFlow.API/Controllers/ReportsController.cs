#nullable enable
using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockFlow.API.Services;

namespace StockFlow.API.Controllers
{
    [Route("api/reports")]
    [ApiController]
    [Authorize(Roles = "Administrator,Cashier")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;
        private readonly IServiceScopeFactory _scopeFactory;

        public ReportsController(IReportService reportService, IServiceScopeFactory scopeFactory)
        {
            _reportService = reportService;
            _scopeFactory = scopeFactory;
        }

        // Consulto el reporte de ventas transaccionales filtrado por fechas y alcance según el rol (HU-16, HU-17, HU-07)
        [HttpGet("sales")]
        public async Task<IActionResult> GetSalesReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int? locationId)
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
            var isAdmin = role == "Administrator";

            // Si es Cajero, fuerzo siempre que solo pueda ver la información de su sede asignada (HU-16)
            int? effectiveLocationId = locationId;
            if (!isAdmin)
            {
                var locationClaim = User.FindFirst("LocationId")?.Value;
                if (!int.TryParse(locationClaim, out int cashierLocationId) || cashierLocationId <= 0)
                {
                    return StatusCode(403, new { message = "Error: Cashier account does not have a valid assigned location." });
                }

                if (locationId.HasValue && locationId.Value != cashierLocationId)
                {
                    return StatusCode(403, new { message = "Error: You can only view sales reports for your assigned location." });
                }

                effectiveLocationId = cashierLocationId;
            }

            if (startDate.HasValue && endDate.HasValue && startDate.Value.Date > endDate.Value.Date)
            {
                return BadRequest(new { message = "Error: Start date cannot be greater than end date." });
            }

            var report = await _reportService.GetTransactionalReportAsync(startDate, endDate, effectiveLocationId, isAdmin);
            return Ok(report);
        }

        // Ejecuto una prueba algorítmica de concurrencia con 20 transacciones simultáneas por sede (60 en total) para validar HU-21 (<= 2000 ms)
        [HttpGet("concurrency-check")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> RunConcurrencyCheck()
        {
            const int locationsCount = 3;
            const int usersPerLocation = 20;
            var totalConcurrentTasks = locationsCount * usersPerLocation;

            var stopwatch = Stopwatch.StartNew();

            var tasks = Enumerable.Range(0, totalConcurrentTasks).Select(async index =>
            {
                var taskSw = Stopwatch.StartNew();
                using var scope = _scopeFactory.CreateScope();
                var scopedReportService = scope.ServiceProvider.GetRequiredService<IReportService>();
                var targetLocationId = (index % locationsCount) + 1;
                await scopedReportService.GetTransactionalReportAsync(null, null, targetLocationId, false);
                taskSw.Stop();
                return taskSw.ElapsedMilliseconds;
            });

            var durations = await Task.WhenAll(tasks);
            stopwatch.Stop();

            var maxDurationMs = durations.Max();
            var avgDurationMs = Math.Round(durations.Average(), 2);

            return Ok(new
            {
                concurrentUsersPerLocation = usersPerLocation,
                totalConcurrentTransactions = totalConcurrentTasks,
                maxTransactionMs = maxDurationMs,
                averageTransactionMs = avgDurationMs,
                totalBatchElapsedMs = stopwatch.ElapsedMilliseconds,
                passesSlaUnder2Seconds = maxDurationMs <= 2000
            });
        }
    }
}
