import type { ReactNode } from 'react';
import styles from './Topbar.module.scss';

interface TopbarProps {
  sedeLabel: string;
  rightSlot?: ReactNode;
}

export function Topbar({ sedeLabel, rightSlot }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.id}>
        <span className={styles.mark}>Stock<em>Flow</em></span>
        <span className={styles.chip}>{sedeLabel}</span>
      </div>
      <div className={styles.right}>{rightSlot}</div>
    </header>
  );
}