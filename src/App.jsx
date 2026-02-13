import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layouts
import MechanicLayout from './components/Layout/MechanicLayout';
import ClientLayout from './components/Layout/ClientLayout';
import ProtectedRoute from './components/Layout/ProtectedRoute';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Mechanic Pages
import Dashboard from './pages/mechanic/Dashboard';
import Clients from './pages/mechanic/Clients';
import Motorcycles from './pages/mechanic/Motorcycles';
import WorkOrders from './pages/mechanic/WorkOrders';
import SpareParts from './pages/mechanic/SpareParts';
import Services from './pages/mechanic/Services';
import Appointments from './pages/mechanic/Appointments';
import Inventory from './pages/mechanic/Inventory';
import Reports from './pages/mechanic/Reports';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';
import MyMotorcycles from './pages/client/MyMotorcycles';
import MyBudgets from './pages/client/MyBudgets';
import MyAppointments from './pages/client/MyAppointments';
import ServiceCatalog from './pages/client/ServiceCatalog';
import Notifications from './pages/client/Notifications';

function HomeRedirect() {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="loader"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (userProfile?.role === 'client') return <Navigate to="/client" replace />;
  return <Navigate to="/mechanic" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e1e2e',
              color: '#cdd6f4',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Mechanic/Admin Routes */}
          <Route path="/mechanic" element={
            <ProtectedRoute allowedRoles={['admin', 'mechanic']}>
              <MechanicLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="motorcycles" element={<Motorcycles />} />
            <Route path="work-orders" element={<WorkOrders />} />
            <Route path="spare-parts" element={<SpareParts />} />
            <Route path="services" element={<Services />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Client Routes */}
          <Route path="/client" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ClientDashboard />} />
            <Route path="motorcycles" element={<MyMotorcycles />} />
            <Route path="budgets" element={<MyBudgets />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="services" element={<ServiceCatalog />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
