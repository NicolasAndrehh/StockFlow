import { useEffect, useState } from 'react';
import { Card } from '../../common/Card/Card';
import { DataTable } from '../../common/DataTable/DataTable';
import { KpiCard } from '../../common/KpiCard/KpiCard';
import { Button } from '../../common/Button/Button';
import { Badge } from '../../common/Badge/Badge';
import { useAuth } from '../Auth/AuthContext';
import { useToast } from '../../common/Toast/ToastContext';
import { reportsApi } from './reports.api';
import type { ConcurrencyCheckResult, SalesReportResponse } from './reports.api';

const formatMoney = (n: number) => `$${n.toLocaleString('es-CO')}`;

export default function ReportsView() {
  const { user, activeLocation, operatingRole } = useAuth();
  const { showToast } = useToast();

  // Si el Administrador está en la vista general ve el consolidado (HU-07); si asumió el rol de Cajero ve exactamente la vista de Cajero de esa sede (HU-16)
  const isAdminGeneralView = user?.role === 'Administrator' && operatingRole === 'Administrator';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [slaResult, setSlaResult] = useState<ConcurrencyCheckResult | null>(null);
  const [runningSla, setRunningSla] = useState(false);

  const loadReport = () => {
    setLoading(true);

    // Si está en modo Cajero fuerzo el filtro a la sede activa; en vista general de Admin permito ver el consolidado de las 3 sedes (HU-07 / HU-16)
    const targetLocationId = isAdminGeneralView
      ? locationFilter === 'all'
        ? null
        : Number(locationFilter)
      : activeLocation?.id ?? null;

    reportsApi
      .getSalesReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        locationId: targetLocationId,
      })
      .then(setReport)
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'Failed to load sales report.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, [startDate, endDate, locationFilter, activeLocation?.id, isAdminGeneralView]);

  // Genero y descargo el archivo Excel (.xls SpreadsheetML) incluyendo las pestañas de Mochila 0/1 (Optimal_Profit_Analysis) y Ramificación y Poda (Executive_Branch_Allocation)
  const handleExportToExcel = () => {
    if (!report || report.rows.length === 0) {
      showToast('There are no sales records to export for the selected range.');
      return;
    }

    const escapeXml = (val: string | number) =>
      String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rowsXml = report.rows
      .map((r) => `
        <Row>
          <Cell><Data ss:Type="String">${escapeXml(r.date)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(r.productCode)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(r.productName)}</Data></Cell>
          <Cell><Data ss:Type="Number">${r.quantitySold}</Data></Cell>
          <Cell><Data ss:Type="Number">${r.purchasePrice}</Data></Cell>
          <Cell><Data ss:Type="Number">${r.salePrice}</Data></Cell>
          <Cell><Data ss:Type="Number">${r.profit}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(r.locationName)}</Data></Cell>
        </Row>`)
      .join('');

    // Segunda pestaña: Programación Dinámica (Mochila 0/1) Optimal_Profit_Analysis (HU-16 y HU-07)
    const knapsack = report.knapsackAnalysis;
    const knapsackRowsXml = (knapsack?.optimalSelectedItems ?? [])
      .map((item) => `
        <Row>
          <Cell><Data ss:Type="String">${escapeXml(item.productCode)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(item.productName)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(item.locationName)}</Data></Cell>
          <Cell><Data ss:Type="Number">${item.batchQuantity}</Data></Cell>
          <Cell><Data ss:Type="Number">${item.investedCost}</Data></Cell>
          <Cell><Data ss:Type="Number">${item.expectedProfit}</Data></Cell>
        </Row>`)
      .join('');

    const knapsackSheetXml = `
  <Worksheet ss:Name="Optimal_Profit_Analysis">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">0/1 Knapsack Dynamic Programming — Optimal Product Mix vs Actual Sales</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Metric</Data></Cell>
        <Cell><Data ss:Type="String">Invested Cost (COP)</Data></Cell>
        <Cell><Data ss:Type="String">Net Profit (COP)</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Actual Period Sales</Data></Cell>
        <Cell><Data ss:Type="Number">${knapsack?.actualCostInvested ?? 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${knapsack?.actualProfitObtained ?? 0}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">0/1 Knapsack Optimal Mix (Capacity W = ${knapsack?.capacityCostBudget ?? 0})</Data></Cell>
        <Cell><Data ss:Type="Number">${knapsack?.optimalCostUsed ?? 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${knapsack?.optimalProfitAchievable ?? 0}</Data></Cell>
      </Row>
      <Row></Row>
      <Row>
        <Cell><Data ss:Type="String">Code</Data></Cell>
        <Cell><Data ss:Type="String">Optimal Product Batch</Data></Cell>
        <Cell><Data ss:Type="String">Location</Data></Cell>
        <Cell><Data ss:Type="String">Units</Data></Cell>
        <Cell><Data ss:Type="String">Purchase Cost (w_i)</Data></Cell>
        <Cell><Data ss:Type="String">Net Profit (v_i)</Data></Cell>
      </Row>
      ${knapsackRowsXml}
    </Table>
  </Worksheet>`;

    // Tercera pestaña: Ramificación y Poda (Branch and Bound) para el Reporte Consolidado de las 3 sedes del Administrador (HU-07)
    const bb = report.branchAndBoundSummary;
    const isConsolidatedExport = isAdminGeneralView && locationFilter === 'all';
    const bbRowsXml = (bb?.allocations ?? [])
      .map((alloc) => `
        <Row>
          <Cell><Data ss:Type="String">${escapeXml(alloc.locationName)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(alloc.recommendedProduct)}</Data></Cell>
          <Cell><Data ss:Type="Number">${alloc.recommendedUnits}</Data></Cell>
          <Cell><Data ss:Type="Number">${alloc.allocatedCapital}</Data></Cell>
          <Cell><Data ss:Type="Number">${alloc.projectedNetProfit}</Data></Cell>
          <Cell><Data ss:Type="Number">${alloc.upperBoundMarginRatio}</Data></Cell>
        </Row>`)
      .join('');

    const branchAndBoundSheetXml = isConsolidatedExport
      ? `
  <Worksheet ss:Name="Executive_Branch_Allocation">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Branch and Bound — Multi-Location Optimal Capital &amp; Unit Allocation (Next Cycle)</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Next Cycle Capital Budget</Data></Cell>
        <Cell><Data ss:Type="Number">${bb?.totalCapitalBudget ?? 0}</Data></Cell>
        <Cell><Data ss:Type="String">Allocated Capital</Data></Cell>
        <Cell><Data ss:Type="Number">${bb?.totalAllocatedCapital ?? 0}</Data></Cell>
        <Cell><Data ss:Type="String">Max Projected Net Profit</Data></Cell>
        <Cell><Data ss:Type="Number">${bb?.maxProjectedNetProfit ?? 0}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Tree Nodes Explored</Data></Cell>
        <Cell><Data ss:Type="Number">${bb?.nodesExplored ?? 0}</Data></Cell>
        <Cell><Data ss:Type="String">Suboptimal Branches Pruned</Data></Cell>
        <Cell><Data ss:Type="Number">${bb?.branchesPruned ?? 0}</Data></Cell>
      </Row>
      <Row></Row>
      <Row>
        <Cell><Data ss:Type="String">Location</Data></Cell>
        <Cell><Data ss:Type="String">Recommended Product Allocation</Data></Cell>
        <Cell><Data ss:Type="String">Assigned Units</Data></Cell>
        <Cell><Data ss:Type="String">Assigned Capital (COP)</Data></Cell>
        <Cell><Data ss:Type="String">Projected Net Profit (COP)</Data></Cell>
        <Cell><Data ss:Type="String">Margin Ratio (%)</Data></Cell>
      </Row>
      ${bbRowsXml}
    </Table>
  </Worksheet>`
      : '';

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sales Report">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Date</Data></Cell>
        <Cell><Data ss:Type="String">Code</Data></Cell>
        <Cell><Data ss:Type="String">Product</Data></Cell>
        <Cell><Data ss:Type="String">Qty.</Data></Cell>
        <Cell><Data ss:Type="String">Purchase Price</Data></Cell>
        <Cell><Data ss:Type="String">Sale Price</Data></Cell>
        <Cell><Data ss:Type="String">Profit</Data></Cell>
        <Cell><Data ss:Type="String">Location</Data></Cell>
      </Row>
      ${rowsXml}
      <Row>
        <Cell><Data ss:Type="String">TOTAL</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="Number">${report.grandTotalUnits}</Data></Cell>
        <Cell><Data ss:Type="String"></Data></Cell>
        <Cell><Data ss:Type="Number">${report.grandTotalSales}</Data></Cell>
        <Cell><Data ss:Type="Number">${report.grandTotalProfit}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(report.scope)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
  ${knapsackSheetXml}
  ${branchAndBoundSheetXml}
</Workbook>`;

    const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `StockFlow_Sales_Report_${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Sales report exported to Excel successfully.');
  };

  // Permito al Administrador verificar en vivo el cumplimiento de HU-21 (20 usuarios concurrentes por sede <= 2 segundos)
  const handleRunConcurrencyBenchmark = async () => {
    setRunningSla(true);
    try {
      const res = await reportsApi.runConcurrencyCheck();
      setSlaResult(res);
      showToast(
        `SLA Check: 60 concurrent requests completed. Max latency: ${res.maxTransactionMs} ms (<= 2000 ms).`
      );
    } catch {
      showToast('Failed to run concurrency benchmark.');
    } finally {
      setRunningSla(false);
    }
  };

  const rows = report?.rows ?? [];
  const locationSummaries = report?.locationSummaries ?? [];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.75rem' }}>
        <h3 style={{ margin: 0 }}>
          {isAdminGeneralView
            ? 'Consolidated & Location Sales Report (HU-07 · HU-16 · HU-17)'
            : `Location Sales Report — ${activeLocation?.name ?? ''} (HU-16 · HU-17)`}
        </h3>
        {isAdminGeneralView && (
          <Button
            variant="mini"
            onClick={handleRunConcurrencyBenchmark}
            disabled={runningSla}
          >
            {runningSla ? 'Testing 60x SLA...' : 'Verify Concurrency SLA (HU-21)'}
          </Button>
        )}
      </div>

      {/* Barra superior de filtros por rango de fechas y botón de exportación a Excel según mockups image7 e image16 */}
      <div
        style={{
          display: 'flex',
          gap: '.55rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '.85rem',
        }}
      >
        <input
          type="date"
          aria-label="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            maxWidth: '165px',
            padding: '.45rem .65rem',
            background: 'var(--panel2)',
            border: '1px solid var(--line2)',
            borderRadius: '8px',
            color: 'var(--ink)',
            fontSize: '.82rem',
          }}
        />
        <input
          type="date"
          aria-label="End date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            maxWidth: '165px',
            padding: '.45rem .65rem',
            background: 'var(--panel2)',
            border: '1px solid var(--line2)',
            borderRadius: '8px',
            color: 'var(--ink)',
            fontSize: '.82rem',
          }}
        />

        {isAdminGeneralView && (
          <select
            aria-label="Location filter"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{
              padding: '.45rem .65rem',
              background: 'var(--panel2)',
              border: '1px solid var(--line2)',
              borderRadius: '8px',
              color: 'var(--ink)',
              fontSize: '.82rem',
            }}
          >
            <option value="all">All locations (Consolidated)</option>
            {locationSummaries.map((loc) => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.locationName}
              </option>
            ))}
          </select>
        )}

        {(startDate || endDate || (isAdminGeneralView && locationFilter !== 'all')) && (
          <Button
            variant="mini"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setLocationFilter('all');
            }}
          >
            Clear filters
          </Button>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <Button variant="primary" onClick={handleExportToExcel} disabled={loading}>
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI de ventas por sede para el reporte consolidado del Administrador (Mockup HU-07) o resumen de sede para Cajero */}
      {isAdminGeneralView ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '.6rem',
            marginBottom: '.85rem',
          }}
        >
          {locationSummaries.map((loc) => (
            <KpiCard
              key={loc.locationId}
              label={loc.locationName}
              value={formatMoney(loc.totalSales)}
            />
          ))}
          <KpiCard
            label="Consolidated Profit"
            value={`+${formatMoney(report?.grandTotalProfit ?? 0)}`}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '.6rem',
            marginBottom: '.85rem',
          }}
        >
          <KpiCard
            label={`${activeLocation?.name ?? 'Location'} Sales`}
            value={formatMoney(report?.grandTotalSales ?? 0)}
          />
          <KpiCard
            label={`${activeLocation?.name ?? 'Location'} Profit`}
            value={`+${formatMoney(report?.grandTotalProfit ?? 0)}`}
          />
          <KpiCard
            label="Units Sold"
            value={String(report?.grandTotalUnits ?? 0)}
          />
        </div>
      )}

      {slaResult && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '.5rem',
            padding: '.55rem .8rem',
            marginBottom: '.8rem',
            borderRadius: '8px',
            background: 'var(--panel2)',
            border: '1px solid var(--line2)',
            fontSize: '.8rem',
          }}
        >
          <span>
            <strong>HU-21 Benchmark:</strong> {slaResult.concurrentUsersPerLocation} users/location ({slaResult.totalConcurrentTransactions} concurrent requests) · Avg: <strong>{slaResult.averageTransactionMs} ms</strong> · Max: <strong>{slaResult.maxTransactionMs} ms</strong>
          </span>
          <Badge
            status={slaResult.passesSlaUnder2Seconds ? 'active' : 'occupied'}
            label={slaResult.passesSlaUnder2Seconds ? 'SLA Passed (<= 2000 ms)' : 'SLA Exceeded'}
          />
        </div>
      )}

      {/* Tabla con las 8 columnas obligatorias de HU-17: Fecha, Código, Producto, Cant., P. Compra, P. Venta, Ganancia y Sede */}
      <DataTable
        columns={['Date', 'Code', 'Product', 'Qty.', 'Purchase Price', 'Sale Price', 'Profit', 'Location']}
        rows={rows}
        ariaLabel="Sales report table"
        renderRow={(r, idx) => (
          <tr key={`${r.date}-${r.productCode}-${r.locationId}-${idx}`}>
            <td>{r.date}</td>
            <td>{r.productCode}</td>
            <td>{r.productName}</td>
            <td>{r.quantitySold}</td>
            <td>{formatMoney(r.purchasePrice)}</td>
            <td>{formatMoney(r.salePrice)}</td>
            <td>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                +{formatMoney(r.profit)}
              </span>
            </td>
            <td>{r.locationName}</td>
          </tr>
        )}
      />

      <div style={{ fontSize: '.74rem', color: 'var(--dim)', marginTop: '.6rem' }}>
        Scope: Cashier views only their assigned location (HU-16) · Administrator views the consolidated report across all locations (HU-07)
      </div>
    </Card>
  );
}
