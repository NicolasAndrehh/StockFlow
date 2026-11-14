import styles from './StepBar.module.scss';

interface StepBarProps {
  current: number;
  total?: number;
  labels?: string[];
}

export function StepBar({ current, total = 4, labels }: StepBarProps) {
  const count = labels ? labels.length : total;

  return (
    <div className={styles.wrapper} aria-label={`Step ${current} of ${count}`}>
      <div className={styles.steps}>
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
          <span key={n} className={n <= current ? styles.on : ''} />
        ))}
      </div>
      {labels && (
        <div className={styles.labels}>
          {labels.map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = stepNum < current;
            const isCurrent = stepNum === current;
            return (
              <div
                key={label}
                className={`${styles.labelItem} ${isCurrent ? styles.current : ''} ${isDone ? styles.done : ''}`}
              >
                <span className={styles.stepNum}>{stepNum}.</span> {label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
