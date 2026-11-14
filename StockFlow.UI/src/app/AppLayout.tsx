import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Topbar } from '../components/common/TopBar/TopBar';
import { SidebarNav } from '../components/common/SideBarNav/SideBarNav';
import { Button } from '../components/common/Button/Button';
import { useAuth, type OperatingRole } from '../components/features/Auth/AuthContext';
import { locationsApi } from '../components/features/Locations/locations.api';
import type { Location } from '../components/features/Locations/locations.api';
import styles from './AppLayout.module.scss';

export function AppLayout() {
  const { user, activeLocation, operatingRole, selectLocation, selectOperatingRole, logout } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const routeLocation = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'Administrator') {
      locationsApi
        .getAll()
        .then((locs) => {
          setLocations(locs);
          // Si ya tenía una sede activa y le cambié el nombre en el catálogo, sincronizo el chip
          if (activeLocation) {
            const updated = locs.find((l) => l.id === activeLocation.id);
            if (updated && updated.name !== activeLocation.name) {
              selectLocation({ id: updated.id, name: updated.name });
            }
          }
        })
        .catch(() => setLocations([]));
    }
  }, [user?.role, routeLocation.pathname]);

  // Al cambiar entre la vista general de Administrador y los roles operativos (Cashier o Waiter), redirijo a la pantalla principal de ese rol
  const handleSwitchAdminOperatingRole = (nextRole: OperatingRole) => {
    selectOperatingRole(nextRole);
    if (nextRole === 'Administrator') {
      navigate('/products');
    } else if (nextRole === 'Cashier') {
      navigate('/inventory');
    } else {
      navigate('/tables');
    }
  };

  // Vista general del Administrador: catálogos, usuarios y reporte consolidado (HU-07)
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
      title: 'Administration & Reports',
      items: [
        { label: 'Users', path: '/users' },
        { label: 'Consolidated Reports', path: '/reports' },
      ],
    },
  ];

  // Vista exacta de Cajero
  const cashierGroups = [
    {
      title: 'Operation',
      items: [
        { label: 'Inventory', path: '/inventory' },
        { label: 'Order Checkout', path: '/billing' },
        { label: 'Sales Reports', path: '/reports' },
      ],
    },
  ];

  // Vista exacta de Mesero
  const waiterGroups = [
    {
      title: 'Operation',
      items: [
        { label: 'Tables', path: '/tables' },
        { label: 'Orders', path: '/orders' },
      ],
    },
  ];

  // Si el Administrador asume el rol de Cajero o Mesero, muestro exactamente el mismo menú lateral de ese rol (HU-06)
  const groups =
    user?.role === 'Administrator'
      ? operatingRole === 'Cashier'
        ? cashierGroups
        : operatingRole === 'Waiter'
        ? waiterGroups
        : adminGroups
      : user?.role === 'Cashier'
      ? cashierGroups
      : user?.role === 'Waiter'
      ? waiterGroups
      : [];

  return (
    <div className={styles.app}>
      <Topbar
        sedeLabel={activeLocation?.name ?? 'Select location'}
        locations={user?.role === 'Administrator' ? locations : undefined}
        selectedLocationId={activeLocation?.id ?? null}
        onSelectLocation={
          user?.role === 'Administrator'
            ? (loc) => selectLocation({ id: loc.id, name: loc.name })
            : undefined
        }
        operatingRole={user?.role === 'Administrator' ? operatingRole : undefined}
        onSelectOperatingRole={
          user?.role === 'Administrator' ? handleSwitchAdminOperatingRole : undefined
        }
        rightSlot={
          <>
            <span>
              {user?.name} ·{' '}
              {user?.role === 'Administrator' && operatingRole !== 'Administrator'
                ? `Admin (${operatingRole} View)`
                : user?.role}
            </span>
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
