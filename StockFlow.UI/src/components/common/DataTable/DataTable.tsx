import type { ReactNode } from 'react';
import styles from './DataTable.module.scss';

interface DataTableProps<T> {
  columns: string[];
  rows: T[];
  renderRow: (row: T, index: number) => ReactNode;
  ariaLabel?: string;
}

export function DataTable<T>({ columns, rows, renderRow, ariaLabel = 'Data table' }: DataTableProps<T>) {
  return (
    <div className={styles.tableWrapper} tabIndex={0} role="region" aria-label={ariaLabel}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={`${col}-${idx}`}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => renderRow(row, i))}
        </tbody>
      </table>
    </div>
  );
}
