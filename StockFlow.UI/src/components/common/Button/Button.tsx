import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.scss';

type ButtonVariant = 'primary' | 'ghost' | 'mini';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}