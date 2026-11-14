#nullable enable
namespace StockFlow.API.Models
{
    public class Order
    {
        public int Id { get; set; }
        public string Status { get; set; } = "Open";
        public DateTime OpeningDate { get; set; }

        // Llave foránea de la mesa atendida
        public int TableId { get; set; }
        public Table? Table { get; set; }

        // Llave foránea del mesero que abrió el pedido
        public int UserId { get; set; }
        public User? User { get; set; }
    }
}
