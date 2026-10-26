import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from '../components/common/TopBar/TopBar';
import { SidebarNav } from '../components/common/SideBarNav/SideBarNav';
import { Button } from '../components/common/Button/Button';
import { useAuth } from '../components/features/Auth/AuthContext';
import { locationsApi } from '../components/features/Locations/locations.api';
import type { Location } from '../components/features/Locations/locations.api';
import styles from './AppLayout.module.scss';

export function AppLayout() {
  const { user, activeLocation, selectLocation, logout } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const routeLocation = useLocation();

  useEffect(() => {
    if (user?.role === 'Administrator') {
      locationsApi
        .getAll()
        .then((locs) => {
          setLocations(locs);
          if (locs.length > 0) {
            const currentValid = activeLocation && locs.some((l) => l.id === activeLocation.id);
            if (!currentValid) {
              selectLocation({ id: locs[0].id, name: locs[0].name });
            } else {
              const updated = locs.find((l) => l.id === activeLocation.id);
              if (updated && updated.name !== activeLocation.name) {
                selectLocation({ id: updated.id, name: updated.name });
              }
            }
          }
        })
        .catch(() => setLocations([]));
    }
  }, [user?.role, routeLocation.pathname]);

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
      title: 'Operation',
      items: [
        { label: 'Inventory', path: '/inventory' },
        { label: 'Tables', path: '/tables' },
        { label: 'Orders', path: '/orders' },
      ],
    },
    {
      title: 'Administration',
      items: [{ label: 'Users', path: '/users' }],
    },
  ];

  const cashierGroups = [
    {
      title: 'Operation',
      items: [{ label: 'Inventory', path: '/inventory' }],
    },
  ];

  const waiterGroups = [
    {
      title: 'Operation',
      items: [
        { label: 'Tables', path: '/tables' },
        { label: 'Orders', path: '/orders' },
      ],
    },
  ];

  const groups =
    user?.role === 'Administrator'
      ? adminGroups
      : user?.role === 'Cashier'
      ? cashierGroups
      : user?.role === 'Waiter'
      ? waiterGroups
      : [];

  return (
    <div className={styles.app}>
      <Topbar
        sedeLabel={activeLocation?.name ?? 'No location'}
        locations={user?.role === 'Administrator' ? locations : undefined}
        selectedLocationId={activeLocation?.id ?? null}
        onSelectLocation={
          user?.role === 'Administrator'
            ? (loc) => selectLocation({ id: loc.id, name: loc.name })
            : undefined
        }
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