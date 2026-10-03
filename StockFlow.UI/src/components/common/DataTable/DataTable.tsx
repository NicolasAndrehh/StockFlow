import type { ReactNode } from 'react';
import styles from './DataTable.module.scss';

interface DataTableProps<T> {
  columns: string[];
  rows: T[];
  renderRow: (row: T, index: number) => ReactNode;
}

export function DataTable<T>({ columns, rows, renderRow }: DataTableProps<T>) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((col) => <th key={col}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => renderRow(row, i))}
      </tbody>
    </table>
  );
}