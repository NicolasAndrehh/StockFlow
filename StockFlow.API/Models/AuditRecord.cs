namespace StockFlow.API.Models
{
    public class AuditRecord
    {
        public int Id { get; set; }
        public string Action { get; set; }
        public string Entity { get; set; }
        public DateTime Date { get; set; }

        // Llave foránea del usuario que ejecutó la acción
        public int UserId { get; set; }
        public User User { get; set; }
    }
}
