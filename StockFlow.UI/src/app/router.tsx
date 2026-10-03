import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../components/features/Auth/AuthContext';
import { ToastProvider } from '../components/common/Toast/ToastContext';
import { ProtectedRoute } from '../components/features/Auth/ProtectedRoute';
import { RequireLocationSelected } from './RequireLocationSelected';
import { HomeRedirect } from './HomeRedirect';
import { AppLayout } from './AppLayout';

import LoginView from '../components/features/Auth/LoginView';
import LocationPickerView from '../components/features/Auth/LocationPickerView';
import NoAccessView from '../components/features/Auth/NoAccessView';
import LocationsView from '../components/features/Locations/LocationsView';
import ProductTypesView from '../components/features/ProductTypes/ProductTypesView';
import SupplierView from '../components/features/Suppliers/SuppliersView';
import ProductView from '../components/features/Products/ProductView';
import UserView from '../components/features/Users/UserView';

export function AppRouter() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginView />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/select-location" element={<LocationPickerView />} />

              <Route element={<RequireLocationSelected />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="/unauthorized" element={<NoAccessView />} />

                  <Route element={<ProtectedRoute allowedRoles={['Administrator']} />}>
                    <Route path="/locations" element={<LocationsView />} />
                    <Route path="/product-types" element={<ProductTypesView />} />
                    <Route path="/suppliers" element={<SupplierView />} />
                    <Route path="/products" element={<ProductView />} />
                    <Route path="/users" element={<UserView />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}