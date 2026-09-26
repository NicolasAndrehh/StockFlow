namespace StockFlow.API.Models
{
    public class Invoice
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime IssuedDate { get; set; }

        // Foreign key Payment
        public int PaymentId { get; set; }
        public Payment Payment { get; set; }
    }
}