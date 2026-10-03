import styles from './KpiCard.module.scss';

interface KpiCardProps {
  label: string;
  value: string;
}

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className={styles.kpi}>
      <div className={styles.lbl}>{label}</div>
      <div className={styles.val}>{value}</div>
    </div>
  );
}