namespace StockFlow.API.Models
{
    public class Payment
    {
        public int Id { get; set; }
        public string PaymentMethod { get; set; }
        public decimal AmountPaid { get; set; }
        public DateTime PaymentDate { get; set; }

        // Llave foránea del pedido que se está cobrando
        public int OrderId { get; set; }
        public Order Order { get; set; }

        // Llave foránea del cajero que recibió el pago
        public int UserId { get; set; }
        public User User { get; set; }
    }
}
