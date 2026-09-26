namespace StockFlow.API.Models
{
    public class InventoryCheckDetail
    {
        public int Id { get; set; }
                
        // Foreign key InventoryCheck
        public int InventoryCheckId { get; set; }
        public InventoryCheck InventoryCheck { get; set; }

        // Foreign key Product
        public int ProductId { get; set; }
        public Product Product { get; set; }

        public int CountedQuantity { get; set; }
    }
}