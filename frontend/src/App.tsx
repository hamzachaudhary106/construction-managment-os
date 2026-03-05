import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import Home from './pages/Home';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import ProjectDashboard from './pages/ProjectDashboard';
import Projects from './pages/Projects';
import Finances from './pages/Finances';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Bills from './pages/Bills';
import Transfers from './pages/Transfers';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import NotificationSettingsPage from './pages/NotificationSettings';
import AuditLog from './pages/AuditLog';
import Milestones from './pages/Milestones';
import Parties from './pages/Parties';
import PurchaseOrders from './pages/PurchaseOrders';
import Variations from './pages/Variations';
import Documents from './pages/Documents';
import Equipment from './pages/Equipment';
import SiteLog from './pages/SiteLog';
import Guarantees from './pages/Guarantees';
import PartnersFunds from './pages/PartnersFunds';
import ProgressPhotos from './pages/ProgressPhotos';
import PunchList from './pages/PunchList';
import RFIList from './pages/RFIList';
import Materials from './pages/Materials';
import Safety from './pages/Safety';
import Submittals from './pages/Submittals';
import Clients from './pages/Clients';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import CostEstimation from './pages/CostEstimation';
import Profile from './pages/Profile';
import ClientDashboard from './pages/ClientDashboard';
import ClientProjectDetail from './pages/ClientProjectDetail';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="client/dashboard" element={<ClientDashboard />} />
          <Route path="client/projects/:projectId" element={<ClientProjectDetail />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId/dashboard" element={<ProjectDashboard />} />
          <Route path="milestones" element={<Milestones />} />
          <Route path="finances" element={<Finances />} />
          <Route path="cost-estimation" element={<CostEstimation />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/:contractId" element={<ContractDetail />} />
          <Route path="bills" element={<Bills />} />
          <Route path="cash-transfers" element={<Transfers />} />
          <Route path="vendors" element={<Parties />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="extra-work" element={<Variations />} />
          <Route path="documents" element={<Documents />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="site-diary" element={<SiteLog />} />
          <Route path="progress-photos" element={<ProgressPhotos />} />
          <Route path="site-issues" element={<PunchList />} />
          <Route path="site-queries" element={<RFIList />} />
          <Route path="materials" element={<Materials />} />
          <Route path="safety" element={<Safety />} />
          <Route path="approval-documents" element={<Submittals />} />
          <Route path="clients" element={<Clients />} />
          <Route path="guarantees" element={<Guarantees />} />
          <Route path="investors" element={<PartnersFunds />} />
          <Route path="employees" element={<Employees />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="notification-settings" element={<NotificationSettingsPage />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
