namespace StockFlow.API.Models
{
    public class AuditRecord
    {
        public int Id { get; set; }
        public string Action { get; set; }
        public string Entity { get; set; }
        public DateTime Date { get; set; }

        // Foreign key User
        public int UserId { get; set; }
        public User User { get; set; }
    }
}