import { NavLink } from 'react-router-dom';
import styles from './SideBarNav.module.scss';

interface NavItem {
  label: string;
  path: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarNavProps {
  groups: NavGroup[];
}

export function SidebarNav({ groups }: SidebarNavProps) {
  return (
    <nav className={styles.nav} aria-label="Primary">
      {groups.map((group) => (
        <div key={group.title} className={styles.groupBlock}>
          <div className={styles.grp}>{group.title}</div>
          <div className={styles.groupLinks}>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.on : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
