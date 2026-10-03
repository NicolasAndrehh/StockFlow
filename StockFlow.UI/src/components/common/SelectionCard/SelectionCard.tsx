import styles from './SelectionCard.module.scss';

interface SelectionCardProps {
  title: string;
  description?: string;
  onClick: () => void;
}

export function SelectionCard({ title, description, onClick }: SelectionCardProps) {
  return (
    <button className={styles.card} onClick={onClick} type="button">
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.desc}>{description}</div>}
    </button>
  );
}