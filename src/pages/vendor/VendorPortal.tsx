import { Routes, Route, Navigate } from 'react-router-dom';
import PortalLayout from './portal/PortalLayout';
import Dashboard from './portal/Dashboard';
import ProfileEdit from './portal/ProfileEdit';
import ProductManagement from './portal/ProductManagement';
import Subscription from './portal/Subscription';

export default function VendorPortal() {
  // In a real app, we would check auth state here.
  // For demo, we assume the user might need to login first.
  // Let's use simple nested routes.
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PortalLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<ProfileEdit />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="subscription" element={<Subscription />} />
      </Route>
    </Routes>
  );
}

