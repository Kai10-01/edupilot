import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Landmark, Users } from 'lucide-react';
import { DemoBanner, Logo } from '../components/ui';
import { api } from '../lib/api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../lib/demoAccounts';
import { useAuth } from '../lib/store';

const ROLE_ICON = { parent: Users, student: GraduationCap, university: Landmark };

export default function Login() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={`/${session.profile.role}`} replace />;

  async function login(e, creds) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.signIn(creds?.email ?? email, creds?.password ?? password);
      await refresh();
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DemoBanner />
      <div className="auth-wrap">
        <div className="card auth-card">
          <div className="center"><Logo /></div>
          <h1>Welcome back</h1>
          <p className="muted center" style={{ margin: '6px 0 22px' }}>Log in to your EduPilot account</p>

          <form onSubmit={login}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" className="input" type="email" autoComplete="email" placeholder="name@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="btn-ghost" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 6, top: 6, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="error" style={{ marginBottom: 14 }}>{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          </form>

          <div className="divider">or try a demo account (one click)</div>
          <div className="demo-logins">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = ROLE_ICON[acc.role];
              return (
                <button key={acc.role} className="btn btn-outline" disabled={busy}
                  onClick={() => login(null, { email: acc.email, password: DEMO_PASSWORD })}>
                  <Icon size={18} /> Log in as {acc.label}
                </button>
              );
            })}
          </div>
          <p className="tiny muted center" style={{ marginTop: 10 }}>
            Tip: open a second tab, log in as the university, and watch the parent’s tracker update live.
          </p>

          <p className="center small" style={{ marginTop: 20 }}>
            Don’t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </>
  );
}
