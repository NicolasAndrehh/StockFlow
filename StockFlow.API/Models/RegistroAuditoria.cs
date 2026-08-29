namespace StockFlow.API.Models
{
    public class RegistroAuditoria
    {
        public int Id { get; set; }
        public string Accion { get; set; }
        public string Entidad { get; set; }
        public DateTime Fecha { get; set; }

        // Foreign key Usuario
        public int UsuarioId { get; set; }
        public Usuario Usuario { get; set; }
    }
}