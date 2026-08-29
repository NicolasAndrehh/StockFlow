namespace StockFlow.API.Models
{
    public class Factura
    {
        public int Id { get; set; }
        public string NumeroFactura { get; set; }
        
        // Foreign key Pago
        public int PagoId { get; set; }
        public Pago Pago { get; set; }
    }
}