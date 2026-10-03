import styles from './TicketSummary.module.scss';

interface TicketItem {
  id: string | number;
  name: string;
  price: number;
}

interface TicketSummaryProps {
  items: TicketItem[];
  formatMoney: (n: number) => string;
  emptyLabel?: string;
}

export function TicketSummary({ items, formatMoney, emptyLabel = 'Sin productos aún' }: TicketSummaryProps) {
  const total = items.reduce((acc, i) => acc + i.price, 0);

  return (
    <>
      {items.length ? (
        items.map((i) => (
          <div key={i.id} className={styles.ticketLine}>
            <span>{i.name}</span>
            <span>{formatMoney(i.price)}</span>
          </div>
        ))
      ) : (
        <div className={styles.empty}>{emptyLabel}</div>
      )}
      <div className={styles.ticketTotal}>
        <span>Total</span>
        <span>{formatMoney(total)}</span>
      </div>
    </>
  );
}