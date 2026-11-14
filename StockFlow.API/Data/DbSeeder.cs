using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using StockFlow.API.Models;

namespace StockFlow.API.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

            // Aplico las migraciones pendientes antes de verificar datos iniciales
            await context.Database.MigrateAsync();

            // Sedes base del negocio (las 3 sucursales del alcance)
            var seedLocations = new List<Location>
            {
                new() { Code = "LOC-01", Name = "Granja", Address = "Calle 77 # 80-15" },
                new() { Code = "LOC-02", Name = "Modelia", Address = "Cra 82 # 23-40" },
                new() { Code = "LOC-03", Name = "Chapinero", Address = "Calle 63 # 10-22" }
            };

            foreach (var loc in seedLocations)
            {
                if (!await context.Locations.AnyAsync(l => l.Code == loc.Code))
                {
                    context.Locations.Add(loc);
                }
            }
            await context.SaveChangesAsync();

            var locations = await context.Locations.OrderBy(l => l.Id).ToListAsync();
            var granja = locations.First(l => l.Code == "LOC-01");
            var modelia = locations.FirstOrDefault(l => l.Code == "LOC-02") ?? granja;
            var chapinero = locations.FirstOrDefault(l => l.Code == "LOC-03") ?? granja;

            // Usuarios de prueba: un Admin global y un Cajero/Mesero por cada sede
            var seedUsers = new List<(string Code, string Name, string Role, int? LocationId, string PlainPassword)>
            {
                ("ADM01", "Administrator", "Administrator", null, "Admin123*"),
                ("CSH01", "Laura Gómez (Cashier Granja)", "Cashier", granja.Id, "Cashier123*"),
                ("WTR01", "Carlos Ruiz (Waiter Granja)", "Waiter", granja.Id, "Waiter123*"),
                ("CSH02", "Andrés Pérez (Cashier Modelia)", "Cashier", modelia.Id, "Cashier123*"),
                ("WTR02", "Sofía Castro (Waiter Modelia)", "Waiter", modelia.Id, "Waiter123*"),
                ("CSH03", "Diana Torres (Cashier Chapinero)", "Cashier", chapinero.Id, "Cashier123*"),
                ("WTR03", "Mateo Vargas (Waiter Chapinero)", "Waiter", chapinero.Id, "Waiter123*")
            };

            foreach (var u in seedUsers)
            {
                if (!await context.Users.AnyAsync(x => x.Code == u.Code))
                {
                    var user = new User
                    {
                        Code = u.Code,
                        Name = u.Name,
                        Role = u.Role,
                        LocationId = u.LocationId,
                        Status = true
                    };
                    user.PasswordHash = passwordHasher.HashPassword(user, u.PlainPassword);
                    context.Users.Add(user);
                }
            }
            await context.SaveChangesAsync();

            // Categorías iniciales para clasificar el catálogo de licores y bebidas
            var typeNames = new[]
            {
                "Tequila",
                "Whisky",
                "Beer",
                "Rum",
                "Vodka",
                "Gin",
                "Aguardiente",
                "Wine",
                "Energy Drinks & Mixers",
                "Snacks"
            };

            foreach (var name in typeNames)
            {
                if (!await context.ProductTypes.AnyAsync(t => t.Name == name))
                {
                    context.ProductTypes.Add(new ProductType { Name = name });
                }
            }
            await context.SaveChangesAsync();

            // Proveedores base para asociar la mercancía
            var supplierNames = new[]
            {
                "Tequila MX",
                "Ron Distribuidores S.A.S",
                "Bavaria Distribución",
                "Diageo Colombia",
                "Pernod Ricard Colombia",
                "Dislicores S.A.S",
                "Fábrica de Licores de Antioquia",
                "Snacks & Bebidas Express"
            };

            foreach (var name in supplierNames)
            {
                if (!await context.Suppliers.AnyAsync(s => s.Name == name))
                {
                    context.Suppliers.Add(new Supplier { Name = name });
                }
            }
            await context.SaveChangesAsync();

            var typesDict = await context.ProductTypes.ToDictionaryAsync(t => t.Name, t => t.Id);
            var suppliersDict = await context.Suppliers.ToDictionaryAsync(s => s.Name, s => s.Id);

            // Catálogo inicial con precio de venta único para las tres sedes
            var seedProducts = new List<(string Code, string Name, decimal Purchase, decimal Sale, string Type, string Supplier)>
            {
                // Tequilas
                ("GM-01", "Gran Malo Tamarindo 750ml", 110000, 180000, "Tequila", "Tequila MX"),
                ("TQ-02", "José Cuervo Especial Reposado 750ml", 85000, 155000, "Tequila", "Tequila MX"),
                ("TQ-03", "Don Julio 70 Cristalino 700ml", 290000, 480000, "Tequila", "Diageo Colombia"),

                // Whiskies
                ("WK-01", "Johnnie Walker Blue Label 750ml", 780000, 1250000, "Whisky", "Diageo Colombia"),
                ("WK-02", "Buchanan's Deluxe 12 Years 750ml", 135000, 240000, "Whisky", "Diageo Colombia"),
                ("WK-03", "Old Parr 12 Years 750ml", 130000, 230000, "Whisky", "Diageo Colombia"),
                ("WK-04", "Chivas Regal 12 Years 750ml", 125000, 220000, "Whisky", "Pernod Ricard Colombia"),

                // Cervezas
                ("BR-01", "Club Colombia Dorada 330ml", 3800, 9000, "Beer", "Bavaria Distribución"),
                ("BR-02", "Corona Extra 355ml", 5200, 12000, "Beer", "Bavaria Distribución"),
                ("BR-03", "Stella Artois 330ml", 5000, 11500, "Beer", "Bavaria Distribución"),
                ("BR-04", "Águila Original 330ml", 3200, 7500, "Beer", "Bavaria Distribución"),

                // Rones
                ("RM-01", "Ron Viejo de Caldas 8 Years 750ml", 68000, 135000, "Rum", "Ron Distribuidores S.A.S"),
                ("RM-02", "Ron Medellín Dorado 750ml", 52000, 105000, "Rum", "Fábrica de Licores de Antioquia"),
                ("RM-03", "Zacapa Centenario 23 Years 750ml", 240000, 410000, "Rum", "Diageo Colombia"),

                // Aguardientes
                ("AG-01", "Aguardiente Antioqueño Sin Azúcar 750ml", 48000, 95000, "Aguardiente", "Fábrica de Licores de Antioquia"),
                ("AG-02", "Aguardiente Amarillo de Manzanares 750ml", 54000, 110000, "Aguardiente", "Ron Distribuidores S.A.S"),

                // Vodka, Ginebra y Vino
                ("VD-01", "Absolut Vodka Original 750ml", 65000, 130000, "Vodka", "Pernod Ricard Colombia"),
                ("GN-01", "Tanqueray London Dry Gin 750ml", 105000, 195000, "Gin", "Diageo Colombia"),
                ("WN-01", "Casillero del Diablo Cabernet 750ml", 45000, 90000, "Wine", "Dislicores S.A.S"),

                // Mezcladores y Pasabocas
                ("MX-01", "Red Bull Energy Drink 250ml", 5500, 12000, "Energy Drinks & Mixers", "Snacks & Bebidas Express"),
                ("MX-02", "Schweppes Ginger Ale / Tonic 300ml", 3000, 7000, "Energy Drinks & Mixers", "Snacks & Bebidas Express"),
                ("SN-01", "Mixed Nuts & Pistachios Bowl", 8000, 18000, "Snacks", "Snacks & Bebidas Express")
            };

            foreach (var p in seedProducts)
            {
                var existing = await context.Products.FirstOrDefaultAsync(x => x.Code == p.Code);
                if (existing == null)
                {
                    context.Products.Add(new Product
                    {
                        Code = p.Code,
                        Name = p.Name,
                        PurchasePrice = p.Purchase,
                        SalePrice = p.Sale,
                        ProductTypeId = typesDict[p.Type],
                        SupplierId = suppliersDict[p.Supplier]
                    });
                }
                else
                {
                    existing.Name = p.Name;
                    existing.PurchasePrice = p.Purchase;
                    existing.SalePrice = p.Sale;
                    existing.ProductTypeId = typesDict[p.Type];
                    existing.SupplierId = suppliersDict[p.Supplier];
                }
            }
            await context.SaveChangesAsync();

            // Inventario inicial independiente para cada sede
            var allProducts = await context.Products.ToListAsync();

            var stockByCode = new Dictionary<string, (int Granja, int Modelia, int Chapinero)>
            {
                ["GM-01"] = (14, 8, 18),
                ["TQ-02"] = (10, 12, 6),
                ["TQ-03"] = (4, 6, 9),
                ["WK-01"] = (2, 1, 4),
                ["WK-02"] = (15, 18, 12),
                ["WK-03"] = (12, 10, 8),
                ["WK-04"] = (8, 5, 0),    // Agotado en Chapinero para probar validación de stock
                ["BR-01"] = (120, 95, 140),
                ["BR-02"] = (85, 110, 75),
                ["BR-03"] = (60, 45, 90),
                ["BR-04"] = (150, 130, 80),
                ["RM-01"] = (16, 14, 20),
                ["RM-02"] = (22, 10, 12),
                ["RM-03"] = (5, 7, 3),
                ["AG-01"] = (35, 28, 40),
                ["AG-02"] = (25, 20, 30),
                ["VD-01"] = (12, 0, 15),   // Agotado en Modelia para probar validación de stock
                ["GN-01"] = (9, 11, 14),
                ["WN-01"] = (10, 8, 16),
                ["MX-01"] = (60, 48, 72),
                ["MX-02"] = (45, 40, 50),
                ["SN-01"] = (30, 25, 35)
            };

            var existingInventories = await context.LocationInventories.ToListAsync();

            foreach (var product in allProducts)
            {
                (int Granja, int Modelia, int Chapinero) stocks = stockByCode.TryGetValue(product.Code, out var s)
                    ? s
                    : (10, 10, 10);

                var perLocation = new[]
                {
                    (LocationId: granja.Id, Qty: stocks.Granja),
                    (LocationId: modelia.Id, Qty: stocks.Modelia),
                    (LocationId: chapinero.Id, Qty: stocks.Chapinero)
                };

                foreach (var target in perLocation)
                {
                    var hasRecord = existingInventories.Any(li =>
                        li.LocationId == target.LocationId && li.ProductId == product.Id);

                    if (!hasRecord)
                    {
                        context.LocationInventories.Add(new LocationInventory
                        {
                            LocationId = target.LocationId,
                            ProductId = product.Id,
                            AvailableQuantity = target.Qty
                        });
                    }
                }
            }
            await context.SaveChangesAsync();

            // Creo 8 mesas libres por sede si todavía no tiene mesas registradas
            foreach (var loc in locations)
            {
                var hasTables = await context.Tables.AnyAsync(t => t.LocationId == loc.Id);
                if (!hasTables)
                {
                    var defaultTables = Enumerable.Range(1, 8).Select(num => new Table
                    {
                        Number = num,
                        Status = "Available",
                        LocationId = loc.Id
                    });
                    context.Tables.AddRange(defaultTables);
                }
            }
            await context.SaveChangesAsync();

            // Si aún no hay órdenes en la base de datos, genero órdenes cerradas (con pago y factura) y órdenes abiertas de ejemplo por sede
            if (!await context.Orders.AnyAsync())
            {
                var productsByCode = allProducts.ToDictionary(p => p.Code);
                var users = await context.Users.ToListAsync();
                var tables = await context.Tables.ToListAsync();

                var waiterGranja = users.FirstOrDefault(u => u.Code == "WTR01") ?? users.First();
                var cashierGranja = users.FirstOrDefault(u => u.Code == "CSH01") ?? users.First();
                var waiterModelia = users.FirstOrDefault(u => u.Code == "WTR02") ?? users.First();
                var cashierModelia = users.FirstOrDefault(u => u.Code == "CSH02") ?? users.First();
                var waiterChapinero = users.FirstOrDefault(u => u.Code == "WTR03") ?? users.First();
                var cashierChapinero = users.FirstOrDefault(u => u.Code == "CSH03") ?? users.First();

                var tableGranja1 = tables.First(t => t.LocationId == granja.Id && t.Number == 1);
                var tableGranja3 = tables.First(t => t.LocationId == granja.Id && t.Number == 3);
                var tableModelia2 = tables.First(t => t.LocationId == modelia.Id && t.Number == 2);
                var tableChapinero4 = tables.First(t => t.LocationId == chapinero.Id && t.Number == 4);

                var closedSamples = new List<(Table Table, User Waiter, User Cashier, string Method, DateTime Date, List<(Product Product, int Qty)> Items)>
                {
                    (
                        tableGranja1,
                        waiterGranja,
                        cashierGranja,
                        "Cash",
                        DateTime.UtcNow.AddHours(-6),
                        new List<(Product, int)>
                        {
                            (productsByCode["BR-04"], 6),
                            (productsByCode["AG-01"], 1)
                        }
                    ),
                    (
                        tableModelia2,
                        waiterModelia,
                        cashierModelia,
                        "Credit Card",
                        DateTime.UtcNow.AddHours(-4),
                        new List<(Product, int)>
                        {
                            (productsByCode["WK-02"], 1),
                            (productsByCode["MX-01"], 4)
                        }
                    ),
                    (
                        tableChapinero4,
                        waiterChapinero,
                        cashierChapinero,
                        "Debit Card",
                        DateTime.UtcNow.AddHours(-2),
                        new List<(Product, int)>
                        {
                            (productsByCode["GM-01"], 1),
                            (productsByCode["BR-02"], 5)
                        }
                    )
                };

                foreach (var sample in closedSamples)
                {
                    var closedOrder = new Order
                    {
                        Status = "Closed",
                        OpeningDate = sample.Date,
                        TableId = sample.Table.Id,
                        UserId = sample.Waiter.Id
                    };
                    context.Orders.Add(closedOrder);
                    await context.SaveChangesAsync();

                    decimal orderTotal = 0m;
                    foreach (var (prod, qty) in sample.Items)
                    {
                        context.OrderDetails.Add(new OrderDetail
                        {
                            OrderId = closedOrder.Id,
                            ProductId = prod.Id,
                            Quantity = qty,
                            UnitPrice = prod.SalePrice
                        });
                        orderTotal += prod.SalePrice * qty;
                    }
                    await context.SaveChangesAsync();

                    var payment = new Payment
                    {
                        OrderId = closedOrder.Id,
                        UserId = sample.Cashier.Id,
                        PaymentMethod = sample.Method,
                        AmountPaid = orderTotal,
                        PaymentDate = sample.Date.AddMinutes(35)
                    };
                    context.Payments.Add(payment);
                    await context.SaveChangesAsync();

                    context.Invoices.Add(new Invoice
                    {
                        PaymentId = payment.Id,
                        InvoiceNumber = $"INV-{closedOrder.Id:D4}-{payment.Id:D4}",
                        IssuedDate = sample.Date.AddMinutes(35)
                    });

                    await context.SaveChangesAsync();
                }

                // Dejo una orden abierta en la Mesa #3 de Granja para que se pueda probar el cierre e impresión de factura de inmediato
                var openOrder = new Order
                {
                    Status = "Open",
                    OpeningDate = DateTime.UtcNow.AddMinutes(-25),
                    TableId = tableGranja3.Id,
                    UserId = waiterGranja.Id
                };
                context.Orders.Add(openOrder);
                await context.SaveChangesAsync();

                context.OrderDetails.AddRange(
                    new OrderDetail
                    {
                        OrderId = openOrder.Id,
                        ProductId = productsByCode["BR-04"].Id,
                        Quantity = 4,
                        UnitPrice = productsByCode["BR-04"].SalePrice
                    },
                    new OrderDetail
                    {
                        OrderId = openOrder.Id,
                        ProductId = productsByCode["RM-01"].Id,
                        Quantity = 1,
                        UnitPrice = productsByCode["RM-01"].SalePrice
                    }
                );

                tableGranja3.Status = "Occupied";
                await context.SaveChangesAsync();
            }
        }
    }
}
