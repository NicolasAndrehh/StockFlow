namespace StockFlow.API.Models
{
    public class Producto
    {
        public int Id { get; set; }
        public string Codigo { get; set; }
        public string Nombre { get; set; }
        public decimal ValorCompra { get; set; }
        public decimal ValorVenta { get; set; }

        //  Foreign Key TipoProducto
        public int TipoProductoId { get; set; }
        public TipoProducto TipoProducto { get; set; }

        // Foreign Key Proveedor
        public int ProveedorId { get; set; }
        public Proveedor Proveedor { get; set; }
    }
}