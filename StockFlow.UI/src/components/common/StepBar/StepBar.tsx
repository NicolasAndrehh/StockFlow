import styles from './StepBar.module.scss';

interface StepBarProps {
  current: number;
  total?: number;
}

export function StepBar({ current, total = 4 }: StepBarProps) {
  return (
    <div className={styles.steps}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <span key={n} className={n <= current ? styles.on : ''} />
      ))}
    </div>
  );
}