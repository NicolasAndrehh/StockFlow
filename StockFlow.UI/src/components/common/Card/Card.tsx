import type { HTMLAttributes } from 'react';
import styles from './Card.module.scss';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${styles.card} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}