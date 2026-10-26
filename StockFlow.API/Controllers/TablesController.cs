using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Data;
using StockFlow.API.Models;

namespace StockFlow.API.Controllers
{
    public class UpdateTableStatusRequest
    {
        public string Status { get; set; } = "Available";
    }

    [Route("api/tables")]
    [ApiController]
    public class TablesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TablesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetTables([FromQuery] int locationId)
        {
            if (locationId <= 0)
            {
                return BadRequest(new { message = "Error: A valid locationId is required." });
            }

            var locationExists = await _context.Locations.AnyAsync(l => l.Id == locationId);
            if (!locationExists)
            {
                return NotFound(new { message = "Error: Location not found." });
            }

            var tables = await _context.Tables
                .Where(t => t.LocationId == locationId)
                .OrderBy(t => t.Number)
                .ToListAsync();

            // Si la sede aún no tiene mesas creadas, inicializamos 8 mesas por defecto
            if (tables.Count == 0)
            {
                var defaultTables = Enumerable.Range(1, 8).Select(num => new Table
                {
                    Number = num,
                    Status = "Available",
                    LocationId = locationId
                }).ToList();

                _context.Tables.AddRange(defaultTables);
                await _context.SaveChangesAsync();
                tables = defaultTables;
            }

            return Ok(tables);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTable([FromBody] Table table)
        {
            if (table.LocationId <= 0 || table.Number <= 0)
            {
                return BadRequest(new { message = "Error: Valid location and table number are required." });
            }

            var exists = await _context.Tables.AnyAsync(t => t.LocationId == table.LocationId && t.Number == table.Number);
            if (exists)
            {
                return BadRequest(new { message = "Error: A table with this number already exists in this location." });
            }

            table.Status = string.IsNullOrWhiteSpace(table.Status) ? "Available" : table.Status;
            _context.Tables.Add(table);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Table created successfully.", table });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTableStatusRequest request)
        {
            var table = await _context.Tables.FindAsync(id);
            if (table == null)
            {
                return NotFound(new { message = "Error: Table not found." });
            }

            if (request.Status != "Available" && request.Status != "Occupied")
            {
                return BadRequest(new { message = "Error: Status must be 'Available' or 'Occupied'." });
            }

            table.Status = request.Status;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Table {table.Number} marked as {table.Status}.", table });
        }
    }
}