import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarDays, CreditCard, History, LayoutDashboard, ListChecks, LogOut, Menu, Wallet,
} from 'lucide-react';
import { api } from '../lib/api';
import { initials } from '../lib/format';
import { DataProvider, useAuth, useData } from '../lib/store';
import { DemoBanner, Logo, Toasts } from './ui';

const NAV = {
  parent: [
    { to: '/parent', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/parent/pay', label: 'Make a Payment', icon: CreditCard },
    { to: '/parent/allowance', label: 'Allowance Schedule', icon: CalendarDays },
    { to: '/parent/history', label: 'Payment History', icon: History },
  ],
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/allowance', label: 'My Allowance', icon: Wallet },
    { to: '/student/history', label: 'Payment History', icon: History },
  ],
  university: [
    { to: '/university', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/university/reconciliation', label: 'Reconciliation', icon: ListChecks },
  ],
};

const ROLE_LABEL = { parent: 'Parent / Family Sponsor', student: 'Student', university: 'University Finance Office' };

export default function AppShell() {
  const { session } = useAuth();
  return (
    <DataProvider profile={session.profile}>
      <Shell profile={session.profile} />
    </DataProvider>
  );
}

function Shell({ profile }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toasts, dismissToast } = useData();

  async function logout() {
    await api.signOut();
    navigate('/login');
  }

  return (
    <>
      <DemoBanner />
      <div className="topbar">
        <Logo to={`/${profile.role}`} />
        <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={18} /> Menu
        </button>
      </div>
      <div className="shell">
        {open && <div className="scrim" onClick={() => setOpen(false)} />}
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <Logo to={`/${profile.role}`} />
          <div className="who">
            <span className="avatar">{initials(profile.full_name)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="bold small">{profile.full_name}</div>
              <div className="tiny muted">{ROLE_LABEL[profile.role]}</div>
            </div>
          </div>
          <nav className="nav" onClick={() => setOpen(false)}>
            {NAV[profile.role].map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}>
                <Icon aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="spacer" />
          <nav className="nav">
            <button onClick={logout}>
              <LogOut aria-hidden="true" /> Log out
            </button>
          </nav>
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
      <Toasts toasts={toasts} onDismiss={dismissToast} onOpen={(id) => navigate(`/payments/${id}`)} />
    </>
  );
}
