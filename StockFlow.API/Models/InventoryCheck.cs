namespace StockFlow.API.Models
{
    public class InventoryCheck
    {
        public int Id { get; set; }
        public DateTime CheckDate { get; set; }

        // Foreign key Location (Sede)
        public int LocationId { get; set; }
        public Location Location { get; set; }

        // Foreign key User (Usuario que hace el conteo)
        public int UserId { get; set; }
        public User User { get; set; }
    }
}