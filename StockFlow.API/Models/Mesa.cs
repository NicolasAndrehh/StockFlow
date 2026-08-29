namespace StockFlow.API.Models
{
    public class Mesa 
    {
        public int Id { get; set; }
        public int Numero { get; set; }
        public string Estado { get; set; }
        
        // Foreign key Sede
        public int SedeId { get; set; }
        public Sede Sede { get; set; }
    }
}