namespace StockFlow.API.Models
{
    public class DetallePedido
    {
        public int Id { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }

        // Foreign key Pedido
        public int PedidoId { get; set; }
        public Pedido Pedido { get; set; }

        // Foreign key Producto
        public int ProductoId { get; set; }
        public Producto Producto { get; set; }

    }   
}