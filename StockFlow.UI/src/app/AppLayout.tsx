import { Outlet } from 'react-router-dom';
import { Topbar } from '../components/common/TopBar/TopBar';
import { SidebarNav } from '../components/common/SideBarNav/SideBarNav';
import { Button } from '../components/common/Button/Button';
import { useAuth } from '../components/features/Auth/AuthContext';
import styles from './AppLayout.module.scss';

export function AppLayout() {
  const { user, activeLocation, logout } = useAuth();

  const adminGroups = [
    {
      title: 'Catalog',
      items: [
        { label: 'Locations', path: '/locations' },
        { label: 'Product types', path: '/product-types' },
        { label: 'Suppliers', path: '/suppliers' },
        { label: 'Products', path: '/products' },
      ],
    },
    {
      title: 'Administration',
      items: [{ label: 'Users', path: '/users' }],
    },
  ];

  const operationGroups: typeof adminGroups = [];

  const groups = user?.role === 'Administrator' ? adminGroups : operationGroups;

  return (
    <div className={styles.app}>
      <Topbar
        sedeLabel={activeLocation?.name ?? '—'}
        rightSlot={
          <>
            <span>{user?.name} · {user?.role}</span>
            <Button variant="mini" onClick={logout}>Sign out</Button>
          </>
        }
      />
      <div className={styles.body}>
        <SidebarNav groups={groups} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}