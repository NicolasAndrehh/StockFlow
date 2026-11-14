namespace StockFlow.API.Models
{
    public class Invoice
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime IssuedDate { get; set; }

        // Llave foránea del pago asociado a la factura física
        public int PaymentId { get; set; }
        public Payment Payment { get; set; }
    }
}
