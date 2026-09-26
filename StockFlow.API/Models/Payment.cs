namespace StockFlow.API.Models
{
    public class Payment
    {
        public int Id { get; set; }
        public string PaymentMethod { get; set; }
        public decimal AmountPaid { get; set; }
        public DateTime PaymentDate { get; set; }

        // Foreign key Order
        public int OrderId { get; set; }
        public Order Order { get; set; }

        // Foreign key User (Cajero)
        public int UserId { get; set; }
        public User User { get; set; }
    }
}