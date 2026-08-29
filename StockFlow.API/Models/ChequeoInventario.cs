namespace StockFlow.API.Models
{
    public class ChequeoInventario
    {
        public int Id { get; set; }
        public DateTime FechaChequeo { get; set; }

        // Foreign key Sede
        public int SedeId { get; set; }
        public Sede Sede { get; set; }

        // Foreign key Usuario
        public int UsuarioId { get; set; }
        public Usuario Usuario { get; set; }
    }
}