namespace StockFlow.API.Models
{
    public class Pago
    {
        public int Id { get; set; }
        public string MetodoPago { get; set; }
        public decimal ValorPagado { get; set; }

        // Foreign key Pedido
        public int PedidoId { get; set; }
        public Pedido Pedido { get; set; }

        // Foreign key Usuario
        public int UsuarioId { get; set; }
        public Usuario Usuario { get; set; }
    }
}