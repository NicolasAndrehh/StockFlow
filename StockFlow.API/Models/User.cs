#nullable enable
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace StockFlow.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;

        [NotMapped]
        public string? Password { get; set; }

        public string Role { get; set; } = string.Empty;
        public int? LocationId { get; set; }
        public Location? Location { get; set; }
        public bool Status { get; set; } = true;
    }
}