import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Wallet } from 'lucide-react';
import { Loading, StatusChip } from '../components/ui';
import { api } from '../lib/api';
import { date, monthYear, rm } from '../lib/format';
import { canPay, obligationStatus, todayISO } from '../lib/rules';
import { familyView, useAuth, useData } from '../lib/store';
import { NoStudent } from './ParentDashboard';
import { StatusActions } from './Tracker';

// Parent: set the release date for each monthly allowance.
// Student: see the schedule and confirm when money arrives.
export default function AllowanceSchedule() {
  const { session } = useAuth();
  const { data } = useData();
  if (!data) return <Loading />;
  const view = familyView(data, session.profile);
  if (!view) return <NoStudent />;
  const isParent = session.profile.role === 'parent';
  const allowances = view.obligations.filter((o) => o.type === 'allowance');
  const total = allowances.reduce((s, o) => s + o.amount_myr, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{isParent ? 'Allowance Schedule' : 'My Allowance'}</h1>
          <p className="muted">
            {allowances.length} monthly releases · {rm(total)} this semester for {view.student.full_name}
          </p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 820 }}>
        <div className="ob-list">
          {allowances.map((ob) => (
            <AllowanceRow key={ob.id} ob={ob} payment={view.paymentByObligation[ob.id]} isParent={isParent}
              student={view.student} profile={session.profile} />
          ))}
        </div>
        <p className="notice" style={{ marginTop: 16 }}>
          <Lock size={18} />
          <span>
            {isParent
              ? 'You will see when each allowance is released and confirmed. Spending after release stays private to your student. That is how EduPilot protects their independence.'
              : 'Your sponsor sees release dates and confirmations only, never your spending.'}
          </span>
        </p>
      </div>
    </>
  );
}

function AllowanceRow({ ob, payment, isParent, student, profile }) {
  const [value, setValue] = useState(ob.scheduled_for || '');
  const [msg, setMsg] = useState('');
  const editable = isParent && canPay(ob);

  async function save(dateISO) {
    setMsg('');
    try {
      await api.schedulePayment(ob.id, dateISO);
      setMsg(dateISO ? 'Saved' : 'Cleared');
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="ob">
      <span className="icon-bubble green"><Wallet size={20} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="title">{monthYear(ob.due_date)} · {rm(ob.amount_myr)}</div>
        <div className="meta">
          <StatusChip status={obligationStatus(ob)} />
          <span>{ob.scheduled_for ? `Release date ${date(ob.scheduled_for)}` : `Planned for ${date(ob.due_date)}`}</span>
        </div>
        {editable && (
          <div className="row wrap" style={{ marginTop: 10, gap: 8 }}>
            <label className="small muted" htmlFor={`d-${ob.id}`}>Release on</label>
            <input id={`d-${ob.id}`} type="date" className="input" style={{ width: 170, padding: '7px 10px' }} min={todayISO()}
              value={value} onChange={(e) => setValue(e.target.value)} />
            <button className="btn btn-outline btn-sm" disabled={!value || value === ob.scheduled_for} onClick={() => save(value)}>Save date</button>
            {ob.scheduled_for && <button className="btn btn-ghost btn-sm" onClick={() => { setValue(''); save(null); }}>Clear</button>}
            {msg && <span className="tiny muted">{msg}</span>}
          </div>
        )}
      </div>
      <div className="actions">
        {payment ? (
          <>
            <Link className="btn btn-outline btn-sm" to={`/payments/${payment.id}`}>Track</Link>
            <StatusActions payment={payment} kind="allowance" role={profile.role} student={student} profile={profile} compact />
          </>
        ) : editable ? (
          <Link className="btn btn-primary btn-sm" to={`/parent/pay?obligation=${ob.id}`}>Release now</Link>
        ) : null}
      </div>
    </div>
  );
}
