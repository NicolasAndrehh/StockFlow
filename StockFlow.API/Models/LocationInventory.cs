namespace StockFlow.API.Models 
{
    public class LocationInventory
    {
        public int Id { get; set; }
        
        // Foreign key Location
        public int LocationId { get; set; }
        public Location Location { get; set; }

        // Foreign key Product
        public int ProductId { get; set; }
        public Product Product { get; set; }

        public int AvailableQuantity { get; set; }
    }
}