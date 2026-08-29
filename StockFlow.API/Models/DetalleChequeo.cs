namespace StockFlow.API.Models
{
    public class DetalleChequeo
    {
        public int Id { get; set; }
                
        // Foreign key Chequeo
        public int ChequeoInventarioId { get; set; }
        public ChequeoInventario ChequeoInventario { get; set; }

        // Foreign key Producto
        public int ProductoId { get; set; }
        public Producto Producto { get; set; }

        public int CantidadContada { get; set; }
    }
}