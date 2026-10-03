import styles from './PayOption.module.scss';

interface PayOptionProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  name: string;
}

export function PayOption({ label, checked, onChange, name }: PayOptionProps) {
  return (
    <label className={`${styles.payOpt} ${checked ? styles.on : ''}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}