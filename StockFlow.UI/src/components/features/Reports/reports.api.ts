import { api } from '../../services/apiClient';

export interface SalesReportRow {
  date: string;
  rawDate: string;
  productCode: string;
  productName: string;
  quantitySold: number;
  purchasePrice: number;
  salePrice: number;
  totalSales: number;
  profit: number;
  locationId: number;
  locationName: string;
}

export interface LocationKpiSummary {
  locationId: number;
  locationName: string;
  totalSales: number;
  totalProfit: number;
  totalUnitsSold: number;
}

export interface KnapsackItemResult {
  productCode: string;
  productName: string;
  locationName: string;
  batchQuantity: number;
  investedCost: number;
  expectedProfit: number;
}

export interface KnapsackAnalysis {
  capacityCostBudget: number;
  actualCostInvested: number;
  actualProfitObtained: number;
  optimalCostUsed: number;
  optimalProfitAchievable: number;
  optimalSelectedItems: KnapsackItemResult[];
}

export interface BranchAllocationRow {
  locationName: string;
  recommendedProduct: string;
  recommendedUnits: number;
  allocatedCapital: number;
  projectedNetProfit: number;
  upperBoundMarginRatio: number;
}

export interface BranchAndBoundSummary {
  totalCapitalBudget: number;
  totalAllocatedCapital: number;
  maxProjectedNetProfit: number;
  nodesExplored: number;
  branchesPruned: number;
  allocations: BranchAllocationRow[];
}

export interface SalesReportResponse {
  scope: string;
  grandTotalSales: number;
  grandTotalProfit: number;
  grandTotalUnits: number;
  locationSummaries: LocationKpiSummary[];
  rows: SalesReportRow[];
  knapsackAnalysis?: KnapsackAnalysis;
  branchAndBoundSummary?: BranchAndBoundSummary;
}

export interface ConcurrencyCheckResult {
  concurrentUsersPerLocation: number;
  totalConcurrentTransactions: number;
  maxTransactionMs: number;
  averageTransactionMs: number;
  totalBatchElapsedMs: number;
  passesSlaUnder2Seconds: boolean;
}

export const reportsApi = {
  // Consulto el reporte de ventas con filtro de fechas y sede según el rol (HU-16, HU-17, HU-07)
  getSalesReport: (params: { startDate?: string; endDate?: string; locationId?: number | null }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.locationId) query.set('locationId', String(params.locationId));
    const qs = query.toString();
    return api.get<SalesReportResponse>(`/reports/sales${qs ? `?${qs}` : ''}`);
  },

  // Ejecuto el chequeo algorítmico de concurrencia de 20 usuarios por sede (60 transacciones simultáneas <= 2 s, HU-21)
  runConcurrencyCheck: () =>
    api.get<ConcurrencyCheckResult>('/reports/concurrency-check'),
};
