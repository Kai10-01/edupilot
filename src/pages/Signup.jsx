import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronRight, GraduationCap, Landmark, Users } from 'lucide-react';
import { DemoBanner, Logo } from '../components/ui';
import { api } from '../lib/api';
import { CURRENCIES, currencyLabel } from '../lib/rules';
import { useAuth } from '../lib/store';

const ROLES = [
  { id: 'student', title: 'I am a student', text: 'View payment details, track your allowances and see your semester plan.', Icon: GraduationCap },
  { id: 'parent', title: 'I am a parent or family sponsor', text: 'Pay tuition, accommodation and living allowances, and track payment status.', Icon: Users },
  { id: 'university', title: 'I am a university representative', text: 'View and manage incoming student payments.', Icon: Landmark },
];

export default function Signup() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({ fullName: '', studentName: '', email: '', password: '', homeCurrency: 'CNY' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={`/${session.profile.role}`} replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { needsConfirmation } = await api.signUp({ ...form, role });
      if (needsConfirmation) {
        setInfo('Account created! Check your email for a confirmation link, then log in.');
      } else {
        await refresh();
        navigate('/app');
      }
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
          <h1>Create your account</h1>
          <p className="muted center" style={{ margin: '6px 0 22px' }}>
            {role ? 'Tell us a little about you' : 'Choose your role to get started'}
          </p>

          {!role && (
            <>
              {ROLES.map(({ id, title, text, Icon }) => (
                <button key={id} className="role-option" onClick={() => setRole(id)}>
                  <span className="icon-bubble"><Icon size={22} /></span>
                  <span className="spacer">
                    <strong>{title}</strong>
                    <span className="small muted">{text}</span>
                  </span>
                  <ChevronRight size={18} color="var(--muted)" />
                </button>
              ))}
            </>
          )}

          {role === 'university' && (
            <div className="stack">
              <div className="notice">
                <Landmark size={18} />
                <span>
                  University accounts are set up by EduPilot during partner onboarding, so families can trust that every
                  payee is genuine. To explore the university view, use the demo account on the login page.
                </span>
              </div>
              <Link className="btn btn-primary" to="/login">Go to login</Link>
              <button className="btn btn-ghost" onClick={() => setRole(null)}>← Choose another role</button>
            </div>
          )}

          {(role === 'parent' || role === 'student') && (
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="fullName">Your full name</label>
                <input id="fullName" className="input" value={form.fullName} onChange={set('fullName')} required />
              </div>
              {role === 'parent' && (
                <>
                  <div className="field">
                    <label htmlFor="studentName">Your student’s name</label>
                    <input id="studentName" className="input" value={form.studentName} onChange={set('studentName')} placeholder="e.g. Emily Tan" />
                  </div>
                  <div className="field">
                    <label htmlFor="cur">Currency you pay in</label>
                    <select id="cur" className="input" value={form.homeCurrency} onChange={set('homeCurrency')}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
              </div>
              <div className="field">
                <label htmlFor="pw">Password (at least 6 characters)</label>
                <input id="pw" className="input" type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={set('password')} required />
              </div>
              <p className="tiny muted" style={{ marginBottom: 14 }}>
                New accounts get a sample Semester Plan so you can try every feature.
              </p>
              {error && <p className="error" style={{ marginBottom: 14 }}>{error}</p>}
              {info && <p className="notice success" style={{ marginBottom: 14 }}>{info}</p>}
              <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
              <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setRole(null)}>
                ← Choose another role
              </button>
            </form>
          )}

          <p className="center small" style={{ marginTop: 20 }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
