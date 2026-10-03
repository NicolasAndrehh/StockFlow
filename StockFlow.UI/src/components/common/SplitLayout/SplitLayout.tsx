import type { ReactNode } from 'react';
import styles from './SplitLayout.module.scss';

interface SplitLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className={styles.split}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}