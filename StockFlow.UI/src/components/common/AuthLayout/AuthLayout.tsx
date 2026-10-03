import type { ReactNode } from 'react';
import styles from './AuthLayout.module.scss';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.brand}>
        Stock<em>Flow</em>
      </div>
      <div className={styles.box}>{children}</div>
    </div>
  );
}