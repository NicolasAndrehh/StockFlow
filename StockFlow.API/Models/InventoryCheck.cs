#nullable enable
namespace StockFlow.API.Models
{
    public class InventoryCheck
    {
        public int Id { get; set; }
        public DateTime CheckDate { get; set; }

        // Llave foránea de la sede donde se realizó el chequeo
        public int LocationId { get; set; }
        public Location? Location { get; set; }

        // Llave foránea del usuario que registró el conteo
        public int UserId { get; set; }
        public User? User { get; set; }
    }
}
