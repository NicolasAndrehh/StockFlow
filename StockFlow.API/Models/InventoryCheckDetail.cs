#nullable enable
namespace StockFlow.API.Models
{
    public class InventoryCheckDetail
    {
        public int Id { get; set; }

        // Llave foránea del encabezado de chequeo de inventario
        public int InventoryCheckId { get; set; }
        public InventoryCheck? InventoryCheck { get; set; }

        // Llave foránea del producto contado
        public int ProductId { get; set; }
        public Product? Product { get; set; }

        public int CountedQuantity { get; set; }
    }
}
