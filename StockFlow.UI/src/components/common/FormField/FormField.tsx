import type { ChangeEvent, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import styles from './FormField.module.scss';

interface BaseProps {
  label: string;
}

interface InputFieldProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  as?: 'input';
}

interface SelectFieldProps extends BaseProps, SelectHTMLAttributes<HTMLSelectElement> {
  as: 'select';
  options: { value: string; label: string }[];
}

interface CurrencyFieldProps extends BaseProps {
  as: 'currency';
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

type FormFieldProps = InputFieldProps | SelectFieldProps | CurrencyFieldProps;

const thousandsFormatter = new Intl.NumberFormat('es-CO');

export function FormField(props: FormFieldProps) {
  const { label } = props;

  if (props.as === 'select') {
    const { as, options, label: _l, ...rest } = props;
    return (
      <div className={styles.field}>
        <label>{label}</label>
        <select {...rest}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (props.as === 'currency') {
    const { value, onChange, placeholder } = props;
    const displayValue = value === 0 ? '' : thousandsFormatter.format(value);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = e.target.value.replace(/\D/g, ''); // deja solo números, ignora puntos/comas
      onChange(digitsOnly === '' ? 0 : Number(digitsOnly));
    };

    return (
      <div className={styles.field}>
        <label>{label}</label>
        <div className={styles.suffixWrap}>
          <input
            type="text"
            inputMode="numeric"
            className={styles.withSuffix}
            value={displayValue}
            placeholder={placeholder ?? '0'}
            onChange={handleChange}
          />
          <span className={styles.suffix}>$</span>
        </div>
      </div>
    );
  }

  const { as, label: _l, ...rest } = props;
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <input {...rest} />
    </div>
  );
}