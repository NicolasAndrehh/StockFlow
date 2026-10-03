import styles from './Badge.module.scss';

type Status = 'available' | 'active' | 'closed' | 'occupied' | 'open' | 'inactive';

interface BadgeProps {
  status: Status;
  label: string;
}

export function Badge({ status, label }: BadgeProps) {
  return <span className={`${styles.status} ${styles[status]}`}>{label}</span>;
}