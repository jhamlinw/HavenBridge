import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import PublicImpactPage from './pages/PublicImpactPage';
import LoginPage from './pages/LoginPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DashboardPage from './pages/DashboardPage';
import CaseDashboardPage from './pages/CaseDashboardPage';
import DonorManagementPage from './pages/DonorManagementPage';
import AdminPortalPage from './pages/AdminPortalPage';
import DonorPortalPage from './pages/DonorPortalPage';
import ReportsPage from './pages/ReportsPage';
import CookieConsent from './components/CookieConsent';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuth = localStorage.getItem('hb_auth') === 'staff';
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/impact" element={<PublicImpactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* Protected staff routes */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="cases" element={<CaseDashboardPage />} />
          <Route path="donors" element={<DonorManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin" element={<AdminPortalPage />} />
          <Route path="donor-portal" element={<DonorPortalPage />} />
        </Route>
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}
