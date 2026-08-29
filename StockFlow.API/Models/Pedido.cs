namespace StockFlow.API.Models
{
    public class Pedido 
    {
        public int Id { get; set; }
        public string Estado { get; set; }
        public DateTime FechaApertura { get; set; }
        
        // Foreign key Mesa
        public int MesaId { get; set; }
        public Mesa Mesa { get; set; }
        
        // Foreign key Usuario
        public int UsuarioId { get; set; }
        public Usuario Usuario { get; set; }
    }
}