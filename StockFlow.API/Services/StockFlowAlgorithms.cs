#nullable enable
namespace StockFlow.API.Services
{
    public class CashDenominationDto
    {
        public int Denomination { get; set; }
        public int Count { get; set; }
        public string Kind { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
    }

    public class KnapsackItemResultDto
    {
        public string ProductCode { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string LocationName { get; set; } = string.Empty;
        public int BatchQuantity { get; set; }
        public decimal InvestedCost { get; set; }
        public decimal ExpectedProfit { get; set; }
    }

    public class KnapsackAnalysisDto
    {
        public decimal CapacityCostBudget { get; set; }
        public decimal ActualCostInvested { get; set; }
        public decimal ActualProfitObtained { get; set; }
        public decimal OptimalCostUsed { get; set; }
        public decimal OptimalProfitAchievable { get; set; }
        public List<KnapsackItemResultDto> OptimalSelectedItems { get; set; } = new();
    }

    public class BranchAllocationRowDto
    {
        public string LocationName { get; set; } = string.Empty;
        public string RecommendedProduct { get; set; } = string.Empty;
        public int RecommendedUnits { get; set; }
        public decimal AllocatedCapital { get; set; }
        public decimal ProjectedNetProfit { get; set; }
        public decimal UpperBoundMarginRatio { get; set; }
    }

    public class BranchAndBoundSummaryDto
    {
        public decimal TotalCapitalBudget { get; set; }
        public decimal TotalAllocatedCapital { get; set; }
        public decimal MaxProjectedNetProfit { get; set; }
        public int NodesExplored { get; set; }
        public int BranchesPruned { get; set; }
        public List<BranchAllocationRowDto> Allocations { get; set; } = new();
    }

    public static class StockFlowAlgorithms
    {
        // =========================================================================
        // 1. MÉTODO DE ORDENAMIENTO: QUICKSORT PROPIO IN-PLACE O(n log n)
        // Uso pivote por mediana de tres para evitar el peor caso cuadrático O(n^2)
        // =========================================================================
        public static void QuickSortInPlace<T>(IList<T> items, Comparison<T> comparison)
        {
            if (items == null || items.Count <= 1)
            {
                return;
            }

            QuickSortRecursive(items, 0, items.Count - 1, comparison);
        }

        private static void QuickSortRecursive<T>(IList<T> items, int low, int high, Comparison<T> comparison)
        {
            if (low >= high)
            {
                return;
            }

            int pivotIndex = PartitionWithMedianOfThree(items, low, high, comparison);
            QuickSortRecursive(items, low, pivotIndex - 1, comparison);
            QuickSortRecursive(items, pivotIndex + 1, high, comparison);
        }

        private static int PartitionWithMedianOfThree<T>(IList<T> items, int low, int high, Comparison<T> comparison)
        {
            int mid = low + ((high - low) / 2);

            // Ordeno low, mid y high entre sí para dejar la mediana como pivote
            if (comparison(items[mid], items[low]) < 0)
            {
                Swap(items, low, mid);
            }
            if (comparison(items[high], items[low]) < 0)
            {
                Swap(items, low, high);
            }
            if (comparison(items[high], items[mid]) < 0)
            {
                Swap(items, mid, high);
            }

            // Coloco la mediana al final como pivote de partición
            Swap(items, mid, high);
            T pivot = items[high];

            int i = low - 1;
            for (int j = low; j < high; j++)
            {
                if (comparison(items[j], pivot) <= 0)
                {
                    i++;
                    Swap(items, i, j);
                }
            }

            Swap(items, i + 1, high);
            return i + 1;
        }

        private static void Swap<T>(IList<T> items, int indexA, int indexB)
        {
            if (indexA == indexB) return;
            T temp = items[indexA];
            items[indexA] = items[indexB];
            items[indexB] = temp;
        }

        // =========================================================================
        // 2. ALGORITMO VORAZ (GREEDY): DESGLOSE ÓPTIMO DE EFECTIVO COP (HU-13 / HU-14)
        // Selecciono vorazmente la mayor denominación disponible en pesos colombianos
        // =========================================================================
        private static readonly int[] CopDenominations =
        {
            100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50
        };

        public static List<CashDenominationDto> ComputeGreedyCashBreakdown(decimal totalPaid)
        {
            var breakdown = new List<CashDenominationDto>();
            long remaining = (long)Math.Round(totalPaid, MidpointRounding.AwayFromZero);

            if (remaining <= 0)
            {
                return breakdown;
            }

            foreach (var denom in CopDenominations)
            {
                if (remaining >= denom)
                {
                    int count = (int)(remaining / denom);
                    remaining %= denom;

                    breakdown.Add(new CashDenominationDto
                    {
                        Denomination = denom,
                        Count = count,
                        Kind = denom >= 2000 ? "Bill" : "Coin",
                        Subtotal = (decimal)count * denom
                    });
                }
            }

            return breakdown;
        }

        // =========================================================================
        // 3. PROGRAMACIÓN DINÁMICA: PROBLEMA DE LA MOCHILA 0/1 O(n * W) (HU-16 / HU-07)
        // Tomo como capacidad W el costo total invertido, pesos w_i el costo de compra
        // y beneficio v_i la ganancia neta obtenida por lote/producto
        // =========================================================================
        public static KnapsackAnalysisDto SolveZeroOneKnapsack(List<TransactionalReportRowDto> reportRows)
        {
            if (reportRows == null || reportRows.Count == 0)
            {
                return new KnapsackAnalysisDto();
            }

            // Construyo los ítems candidatos a partir de los lotes vendidos y variantes de volumen
            var candidates = new List<KnapsackItemResultDto>();
            foreach (var row in reportRows)
            {
                decimal unitCost = row.PurchasePrice;
                decimal unitProfit = row.SalePrice - row.PurchasePrice;
                if (unitCost <= 0 || unitProfit <= 0) continue;

                // Agrego el lote real vendido y un lote de expansión (+25% de unidades) para evaluar la combinación óptima bajo el mismo presupuesto W
                candidates.Add(new KnapsackItemResultDto
                {
                    ProductCode = row.ProductCode,
                    ProductName = row.ProductName,
                    LocationName = row.LocationName,
                    BatchQuantity = row.QuantitySold,
                    InvestedCost = unitCost * row.QuantitySold,
                    ExpectedProfit = unitProfit * row.QuantitySold
                });

                int optimizedQty = Math.Max(1, (int)Math.Ceiling(row.QuantitySold * 0.5));
                candidates.Add(new KnapsackItemResultDto
                {
                    ProductCode = $"{row.ProductCode}-HALF",
                    ProductName = $"{row.ProductName} (Half Batch)",
                    LocationName = row.LocationName,
                    BatchQuantity = optimizedQty,
                    InvestedCost = unitCost * optimizedQty,
                    ExpectedProfit = unitProfit * optimizedQty
                });
            }

            decimal totalActualCost = reportRows.Sum(r => r.PurchasePrice * r.QuantitySold);
            decimal totalActualProfit = reportRows.Sum(r => r.Profit);

            if (totalActualCost <= 0 || candidates.Count == 0)
            {
                return new KnapsackAnalysisDto
                {
                    CapacityCostBudget = totalActualCost,
                    ActualCostInvested = totalActualCost,
                    ActualProfitObtained = totalActualProfit
                };
            }

            // Escalo la capacidad W en pasos discretos para que la matriz DP O(n * W) corra en pocos milisegundos
            decimal scaleStep = Math.Max(1000m, Math.Ceiling(totalActualCost / 600m));
            int W = (int)Math.Floor(totalActualCost / scaleStep);
            int n = candidates.Count;

            var weights = new int[n];
            var values = new decimal[n];
            for (int i = 0; i < n; i++)
            {
                weights[i] = Math.Max(1, (int)Math.Round(candidates[i].InvestedCost / scaleStep));
                values[i] = candidates[i].ExpectedProfit;
            }

            // Tabla de Programación Dinámica dp[i, w]
            var dp = new decimal[n + 1, W + 1];

            for (int i = 1; i <= n; i++)
            {
                int wi = weights[i - 1];
                decimal vi = values[i - 1];

                for (int w = 0; w <= W; w++)
                {
                    if (wi <= w)
                    {
                        decimal take = dp[i - 1, w - wi] + vi;
                        decimal skip = dp[i - 1, w];
                        dp[i, w] = take > skip ? take : skip;
                    }
                    else
                    {
                        dp[i, w] = dp[i - 1, w];
                    }
                }
            }

            // Reconstruyo los productos seleccionados desde dp[n, W]
            var selected = new List<KnapsackItemResultDto>();
            int remainingW = W;
            for (int i = n; i >= 1 && remainingW > 0; i--)
            {
                if (dp[i, remainingW] != dp[i - 1, remainingW])
                {
                    selected.Add(candidates[i - 1]);
                    remainingW -= weights[i - 1];
                }
            }

            selected.Reverse();

            return new KnapsackAnalysisDto
            {
                CapacityCostBudget = totalActualCost,
                ActualCostInvested = totalActualCost,
                ActualProfitObtained = totalActualProfit,
                OptimalCostUsed = selected.Sum(x => x.InvestedCost),
                OptimalProfitAchievable = selected.Sum(x => x.ExpectedProfit),
                OptimalSelectedItems = selected
            };
        }

        // =========================================================================
        // 4. BACKTRACKING CON PODA TEMPRANA: SUBSET SUM EN AUDITORÍA DE INVENTARIO (HU-15)
        // Busco qué combinación exacta de pedidos cerrados explica una diferencia de stock
        // =========================================================================
        public static List<string> FindDiscrepancyTransactionsByBacktracking(
            int targetDifference,
            List<(int OrderId, int Quantity, decimal Subtotal)> closedTransactions)
        {
            var matchedCombinations = new List<string>();
            if (targetDifference <= 0 || closedTransactions == null || closedTransactions.Count == 0)
            {
                return matchedCombinations;
            }

            // Ordeno las transacciones de mayor a menor cantidad usando mi QuickSort propio para acelerar la poda
            var sorted = new List<(int OrderId, int Quantity, decimal Subtotal)>(closedTransactions);
            QuickSortInPlace(sorted, (a, b) => b.Quantity.CompareTo(a.Quantity));

            // Precalculo las sumas sufijo para podar ramas que ni sumando todo el resto alcanzarían el objetivo
            var suffixSums = new int[sorted.Count + 1];
            for (int i = sorted.Count - 1; i >= 0; i--)
            {
                suffixSums[i] = suffixSums[i + 1] + sorted[i].Quantity;
            }

            var currentSelection = new List<(int OrderId, int Quantity, decimal Subtotal)>();

            void Backtrack(int index, int currentSum)
            {
                // Limito a las 3 primeras combinaciones exactas para mantener el log de auditoría conciso
                if (matchedCombinations.Count >= 3)
                {
                    return;
                }

                if (currentSum == targetDifference)
                {
                    var trace = string.Join("+", currentSelection.Select(x => $"Ord#{x.OrderId}({x.Quantity}u)"));
                    matchedCombinations.Add(trace);
                    return;
                }

                // Poda temprana: si me pasé del descuadre o si ni sumando todos los restantes llego al objetivo, corto la rama
                if (index >= sorted.Count || currentSum > targetDifference || currentSum + suffixSums[index] < targetDifference)
                {
                    return;
                }

                // Rama 1: Incluyo la transacción actual
                currentSelection.Add(sorted[index]);
                Backtrack(index + 1, currentSum + sorted[index].Quantity);
                currentSelection.RemoveAt(currentSelection.Count - 1);

                // Rama 2: Excluyo la transacción actual
                Backtrack(index + 1, currentSum);
            }

            Backtrack(0, 0);
            return matchedCombinations;
        }

        // =========================================================================
        // 5. RAMIFICACIÓN Y PODA (BRANCH AND BOUND): ASIGNACIÓN ÓPTIMA MULTI-SEDE (HU-07)
        // Calculo cotas superiores (Upper Bound) de rentabilidad por sede para asignar
        // de forma óptima el capital del siguiente ciclo entre las 3 sucursales
        // =========================================================================
        private class BranchCandidate
        {
            public string LocationName { get; set; } = string.Empty;
            public string ProductName { get; set; } = string.Empty;
            public int Units { get; set; }
            public decimal Cost { get; set; }
            public decimal Profit { get; set; }
            public decimal Ratio => Cost > 0 ? Profit / Cost : 0m;
        }

        private class BbNode
        {
            public int Level { get; set; }
            public decimal Profit { get; set; }
            public decimal Cost { get; set; }
            public decimal UpperBound { get; set; }
            public List<int> ChosenIndices { get; set; } = new();
        }

        public static BranchAndBoundSummaryDto SolveBranchAndBoundAllocation(
            List<LocationSummaryKpiDto> locations,
            List<TransactionalReportRowDto> allRows)
        {
            var candidates = new List<BranchCandidate>();

            foreach (var row in allRows)
            {
                decimal cost = row.PurchasePrice * row.QuantitySold;
                decimal profit = row.Profit;
                if (cost <= 0 || profit <= 0) continue;

                candidates.Add(new BranchCandidate
                {
                    LocationName = row.LocationName,
                    ProductName = $"{row.ProductCode} · {row.ProductName}",
                    Units = row.QuantitySold,
                    Cost = cost,
                    Profit = profit
                });
            }

            if (candidates.Count == 0)
            {
                return new BranchAndBoundSummaryDto();
            }

            // Ordeno los paquetes candidatos por densidad de utilidad (Profit / Cost) descendente usando mi QuickSort propio
            QuickSortInPlace(candidates, (a, b) => b.Ratio.CompareTo(a.Ratio));

            // Defino el capital objetivo del siguiente ciclo como el 85% del costo histórico para forzar la selección de las ramas más rentables
            decimal totalHistoricalCost = candidates.Sum(c => c.Cost);
            decimal budgetCapacity = Math.Round(totalHistoricalCost * 0.85m, 2);

            decimal ComputeUpperBound(int nextIndex, decimal currentCost, decimal currentProfit)
            {
                if (currentCost >= budgetCapacity)
                {
                    return 0m;
                }

                decimal profitBound = currentProfit;
                decimal totalCost = currentCost;
                int idx = nextIndex;

                while (idx < candidates.Count && totalCost + candidates[idx].Cost <= budgetCapacity)
                {
                    totalCost += candidates[idx].Cost;
                    profitBound += candidates[idx].Profit;
                    idx++;
                }

                // Relajación fraccional para calcular la cota superior (Upper Bound)
                if (idx < candidates.Count)
                {
                    decimal remainingBudget = budgetCapacity - totalCost;
                    profitBound += remainingBudget * candidates[idx].Ratio;
                }

                return profitBound;
            }

            var queue = new PriorityQueue<BbNode, decimal>();
            var root = new BbNode
            {
                Level = -1,
                Cost = 0m,
                Profit = 0m,
                UpperBound = ComputeUpperBound(0, 0m, 0m)
            };

            // Uso prioridad negativa porque PriorityQueue en .NET extrae primero el menor valor
            queue.Enqueue(root, -root.UpperBound);

            decimal maxProfit = 0m;
            List<int> bestIndices = new();
            int nodesExplored = 0;
            int branchesPruned = 0;

            while (queue.Count > 0 && nodesExplored < 1500)
            {
                var current = queue.Dequeue();
                nodesExplored++;

                if (current.UpperBound <= maxProfit || current.Level >= candidates.Count - 1)
                {
                    branchesPruned++;
                    continue;
                }

                int nextLevel = current.Level + 1;
                var item = candidates[nextLevel];

                // Rama izquierda: incluyo la asignación para esta sede si cabe en el presupuesto
                if (current.Cost + item.Cost <= budgetCapacity)
                {
                    var withItemIndices = new List<int>(current.ChosenIndices) { nextLevel };
                    decimal newProfit = current.Profit + item.Profit;
                    decimal newCost = current.Cost + item.Cost;

                    if (newProfit > maxProfit)
                    {
                        maxProfit = newProfit;
                        bestIndices = withItemIndices;
                    }

                    decimal boundWith = ComputeUpperBound(nextLevel + 1, newCost, newProfit);
                    if (boundWith > maxProfit)
                    {
                        queue.Enqueue(new BbNode
                        {
                            Level = nextLevel,
                            Cost = newCost,
                            Profit = newProfit,
                            UpperBound = boundWith,
                            ChosenIndices = withItemIndices
                        }, -boundWith);
                    }
                    else
                    {
                        branchesPruned++;
                    }
                }

                // Rama derecha: excluyo la asignación actual y evalúo si la cota superior aún supera el mejor valor conocido
                decimal boundWithout = ComputeUpperBound(nextLevel + 1, current.Cost, current.Profit);
                if (boundWithout > maxProfit)
                {
                    queue.Enqueue(new BbNode
                    {
                        Level = nextLevel,
                        Cost = current.Cost,
                        Profit = current.Profit,
                        UpperBound = boundWithout,
                        ChosenIndices = new List<int>(current.ChosenIndices)
                    }, -boundWithout);
                }
                else
                {
                    branchesPruned++;
                }
            }

            var allocations = bestIndices.Select(i => new BranchAllocationRowDto
            {
                LocationName = candidates[i].LocationName,
                RecommendedProduct = candidates[i].ProductName,
                RecommendedUnits = candidates[i].Units,
                AllocatedCapital = candidates[i].Cost,
                ProjectedNetProfit = candidates[i].Profit,
                UpperBoundMarginRatio = Math.Round(candidates[i].Ratio * 100m, 2)
            }).ToList();

            return new BranchAndBoundSummaryDto
            {
                TotalCapitalBudget = budgetCapacity,
                TotalAllocatedCapital = allocations.Sum(a => a.AllocatedCapital),
                MaxProjectedNetProfit = maxProfit,
                NodesExplored = nodesExplored,
                BranchesPruned = branchesPruned,
                Allocations = allocations
            };
        }
    }
}
