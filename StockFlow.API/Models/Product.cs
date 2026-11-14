#nullable enable
namespace StockFlow.API.Models
{
    public class Product
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }

        // Llave foránea del tipo de producto
        public int ProductTypeId { get; set; }
        public ProductType? ProductType { get; set; }

        // Llave foránea del proveedor asociado
        public int SupplierId { get; set; }
        public Supplier? Supplier { get; set; }
    }
}
