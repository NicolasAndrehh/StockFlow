namespace StockFlow.API.Models
{
    public class OrderDetail
    {
        public int Id { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }

        // Foreign key Order
        public int OrderId { get; set; }
        public Order Order { get; set; }

        // Foreign key Product
        public int ProductId { get; set; }
        public Product Product { get; set; }
    }   
}