import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import AppShell from './components/AppShell';
import { Loading } from './components/ui';
import { AuthProvider, useAuth } from './lib/store';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ParentDashboard from './pages/ParentDashboard';
import PayFlow from './pages/PayFlow';
import AllowanceSchedule from './pages/AllowanceSchedule';
import History from './pages/History';
import StudentDashboard from './pages/StudentDashboard';
import UniversityDashboard from './pages/UniversityDashboard';
import Tracker from './pages/Tracker';
import Receipt from './pages/Receipt';

// Only lets in users with the right role; everyone else goes to their own home.
function RequireRole({ roles }) {
  const { session } = useAuth();
  if (session === undefined) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(session.profile.role)) return <Navigate to={`/${session.profile.role}`} replace />;
  return <AppShell />;
}

function HomeRedirect() {
  const { session } = useAuth();
  if (session === undefined) return <Loading />;
  return <Navigate to={session ? `/${session.profile.role}` : '/login'} replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/app" element={<HomeRedirect />} />

          <Route element={<RequireRole roles={['parent']} />}>
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/parent/pay" element={<PayFlow />} />
            <Route path="/parent/allowance" element={<AllowanceSchedule />} />
            <Route path="/parent/history" element={<History />} />
          </Route>
          <Route element={<RequireRole roles={['student']} />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/allowance" element={<AllowanceSchedule />} />
            <Route path="/student/history" element={<History />} />
          </Route>
          <Route element={<RequireRole roles={['university']} />}>
            <Route path="/university" element={<UniversityDashboard />} />
            <Route path="/university/reconciliation" element={<UniversityDashboard focus />} />
          </Route>
          <Route element={<RequireRole />}>
            <Route path="/payments/:id" element={<Tracker />} />
            <Route path="/receipt/:id" element={<Receipt />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);