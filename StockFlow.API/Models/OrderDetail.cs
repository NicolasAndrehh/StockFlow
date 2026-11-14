#nullable enable
namespace StockFlow.API.Models
{
    public class OrderDetail
    {
        public int Id { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }

        // Llave foránea del pedido al que pertenece el ítem
        public int OrderId { get; set; }
        public Order? Order { get; set; }

        // Llave foránea del producto solicitado
        public int ProductId { get; set; }
        public Product? Product { get; set; }
    }
}
