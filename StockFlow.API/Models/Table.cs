#nullable enable
namespace StockFlow.API.Models
{
    public class Table
    {
        public int Id { get; set; }
        public int Number { get; set; }
        public string Status { get; set; } = "Available";

        // Llave foránea de la sede a la que pertenece la mesa
        public int LocationId { get; set; }
        public Location? Location { get; set; }
    }
}
