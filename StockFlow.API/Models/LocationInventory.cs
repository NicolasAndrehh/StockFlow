#nullable enable
namespace StockFlow.API.Models
{
    public class LocationInventory
    {
        public int Id { get; set; }

        // Llave foránea de la sede propietaria del stock
        public int LocationId { get; set; }
        public Location? Location { get; set; }

        // Llave foránea del producto en inventario
        public int ProductId { get; set; }
        public Product? Product { get; set; }

        public int AvailableQuantity { get; set; }
    }
}
