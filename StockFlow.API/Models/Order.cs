namespace StockFlow.API.Models
{
    public class Order 
    {
        public int Id { get; set; }
        public string Status { get; set; }
        public DateTime OpeningDate { get; set; }
        
        // Foreign key Table (Mesa)
        public int TableId { get; set; }
        public Table Table { get; set; }
        
        // Foreign key User (Mesero)
        public int UserId { get; set; }
        public User User { get; set; }
    }
}