import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { OperatingRole } from '../../features/Auth/AuthContext';
import styles from './TopBar.module.scss';

export interface TopbarLocationOption {
  id: number;
  name: string;
}

interface TopbarProps {
  sedeLabel: string;
  locations?: TopbarLocationOption[];
  selectedLocationId?: number | null;
  onSelectLocation?: (location: TopbarLocationOption) => void;
  operatingRole?: OperatingRole;
  onSelectOperatingRole?: (role: OperatingRole) => void;
  rightSlot?: ReactNode;
}

export function Topbar({
  sedeLabel,
  locations,
  selectedLocationId,
  onSelectLocation,
  operatingRole,
  onSelectOperatingRole,
  rightSlot,
}: TopbarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canSwitchLocation = Boolean(onSelectLocation && locations && locations.length > 0);
  const currentLocation = locations?.find((l) => l.id === selectedLocationId);
  const displayLabel = currentLocation ? currentLocation.name : sedeLabel;

  // Cierro el selector de sede si hago clic fuera del contenedor o presiono Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.id}>
        <span className={styles.mark}>
          Stock<em>Flow</em>
        </span>

        {canSwitchLocation ? (
          <div className={styles.switcher} ref={dropdownRef}>
            <button
              type="button"
              className={`${styles.chipBtn} ${open ? styles.chipBtnActive : ''}`}
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
              title="Switch operating location"
            >
              <span className={styles.dot} />
              <span className={styles.chipText}>{displayLabel}</span>
              <svg
                className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {open && (
              <div className={styles.menu}>
                <div className={styles.menuHeader}>Active Location</div>
                <div className={styles.menuList}>
                  {locations!.map((loc) => {
                    const isSelected = loc.id === selectedLocationId;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        className={`${styles.menuItem} ${isSelected ? styles.menuItemActive : ''}`}
                        onClick={() => {
                          onSelectLocation!(loc);
                          setOpen(false);
                        }}
                      >
                        <span className={styles.itemLabel}>{loc.name}</span>
                        {isSelected && (
                          <svg
                            className={styles.checkIcon}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className={styles.chip}>
            <span className={styles.dot} />
            {sedeLabel}
          </span>
        )}

        {onSelectOperatingRole && operatingRole && (
          <div className={styles.roleControls}>
            <div className={styles.roleSwitch} role="group" aria-label="Operate location as Cashier or Waiter">
              <span className={styles.roleSwitchLabel}>Operate as:</span>
              <button
                type="button"
                className={`${styles.rolePill} ${operatingRole === 'Cashier' ? styles.rolePillActive : ''}`}
                onClick={() => onSelectOperatingRole('Cashier')}
              >
                Cashier
              </button>
              <button
                type="button"
                className={`${styles.rolePill} ${operatingRole === 'Waiter' ? styles.rolePillActive : ''}`}
                onClick={() => onSelectOperatingRole('Waiter')}
              >
                Waiter
              </button>
            </div>

            {operatingRole !== 'Administrator' && (
              <button
                type="button"
                className={styles.adminReturnBtn}
                onClick={() => onSelectOperatingRole('Administrator')}
                title="Return to general Administrator view"
              >
                ← Back to Admin View
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.right}>{rightSlot}</div>
    </header>
  );
}
