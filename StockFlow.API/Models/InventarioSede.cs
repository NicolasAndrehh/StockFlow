namespace  StockFlow.API.Models 
{
    public class InventarioSede
    {
        public int Id { get; set; }
        public int SedeId { get; set; }
        public Sede Sede { get; set; }

        public int ProductoId { get; set; }
        public Producto Producto { get; set; }

        public int CantidadDisponible { get; set; }
    }
}