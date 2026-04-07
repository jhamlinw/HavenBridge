import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import PublicImpactPage from './pages/PublicImpactPage';
import LoginPage from './pages/LoginPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CaseDashboardPage from './pages/CaseDashboardPage';
import DonorManagementPage from './pages/DonorManagementPage';
import AdminPortalPage from './pages/AdminPortalPage';
import DonorPortalPage from './pages/DonorPortalPage';
import ReportsPage from './pages/ReportsPage';
import CookieConsent from './components/CookieConsent';
import { isAuthenticated, hasRole } from './services/auth';

/** Requires a valid JWT. Redirects unauthenticated users to /login. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Requires Staff or Admin role. Donors are redirected to their portal. */
function RequireStaff({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!hasRole('Staff')) return <Navigate to="/donor-portal" replace />;
  return <>{children}</>;
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
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* Staff & Admin protected routes */}
        <Route element={<RequireStaff><AppLayout /></RequireStaff>}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="cases" element={<CaseDashboardPage />} />
          <Route path="donors" element={<DonorManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin" element={<AdminPortalPage />} />
        </Route>

        {/* Donor portal — accessible to any authenticated user */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="donor-portal" element={<DonorPortalPage />} />
        </Route>
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}
