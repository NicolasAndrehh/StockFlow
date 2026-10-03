using System.Text.Json.Serialization;

namespace StockFlow.API.Models
{
    public class ProductType
    {
        public int Id { get; set; }
        public string Name { get; set; }

        // Relación inversa
        [JsonIgnore]
        public ICollection<Product> Products { get; set; } = new List<Product>();
    }
}