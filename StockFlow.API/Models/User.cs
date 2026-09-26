namespace StockFlow.API.Models 
{
    public class User
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }          
        public string PasswordHash { get; set; } 
        public string Role { get; set; }
        public string Status { get; set; }

        // Foreign key Location — ahora opcional (nullable),
        // porque el Administrador puede existir sin sede asignada (HU-01)
        public int? LocationId { get; set; }
        public Location Location { get; set; }
    }
}