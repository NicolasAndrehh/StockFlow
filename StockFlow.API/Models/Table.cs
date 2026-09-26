namespace StockFlow.API.Models
{
    public class Table 
    {
        public int Id { get; set; }
        public int Number { get; set; }
        public string Status { get; set; }
        
        // Foreign key Location (Sede)
        public int LocationId { get; set; }
        public Location Location { get; set; }
    }
}