import { NavLink } from 'react-router-dom';
import styles from './SidebarNav.module.scss';

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
    <aside className={styles.nav}>
      {groups.map((group) => (
        <div key={group.title}>
          <div className={styles.grp}>{group.title}</div>
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
      ))}
    </aside>
  );
}