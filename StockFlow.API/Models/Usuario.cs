namespace StockFlow.API.Models 
{
    public  class  Usuario
    {
        public int Id { get; set; }
        public string Codigo { get; set; }
        public string Rol { get; set; }
        public string Estado { get; set; }
        
        // Foreign key Sede
        public int SedeId { get; set; }
        public Sede Sede { get; set; }
    }
}