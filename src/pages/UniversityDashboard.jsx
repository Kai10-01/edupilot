import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Inbox, MessageCircleOff, Timer, Wallet } from 'lucide-react';
import { ActivityList } from '../components/PlanParts';
import { Loading, PaymentChip, Stat } from '../components/ui';
import { date, rm } from '../lib/format';
import { TYPE_LABEL } from '../lib/rules';
import { useAuth, useData } from '../lib/store';
import { StatusActions } from './Tracker';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'processing', label: 'Incoming' },
  { id: 'received', label: 'Awaiting match' },
  { id: 'confirmed', label: 'Matched' },
];

export default function UniversityDashboard({ focus = false }) {
  const { session } = useAuth();
  const { data, error } = useData();
  const [filter, setFilter] = useState(focus ? 'received' : 'all');
  if (error) return <p className="error">{error}</p>;
  if (!data) return <Loading />;

  const university = data.universities.find((u) => u.id === session.profile.university_id);
  const students = Object.fromEntries(data.students.map((s) => [s.id, s]));
  const obligations = Object.fromEntries(data.obligations.map((o) => [o.id, o]));
  const payments = [...data.payments].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const count = (st) => payments.filter((p) => p.status === st);
  const received = payments.filter((p) => p.status === 'received' || p.status === 'confirmed');
  const enquiriesAvoided = payments.reduce((s, p) => s + (p.status_checks || 0), 0);
  const shown = filter === 'all' ? payments : count(filter);
  const events = [...data.payment_events]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((e) => {
      const payment = data.payments.find((p) => p.id === e.payment_id);
      return { ...e, payment, obligation: payment && obligations[payment.obligation_id], studentName: students[e.student_id]?.full_name };
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{focus ? 'Reconciliation' : 'Dashboard'}</h1>
          <p className="muted">{university?.name}: incoming student payments, matched by invoice and student ID.</p>
        </div>
        <span className="live">Live</span>
      </div>

      <div className="stats">
        <Stat icon={Wallet} label="Received this semester" value={rm(received.reduce((s, p) => s + p.amount_myr, 0))}
          sub={`${received.length} payments`} />
        <Stat icon={Inbox} tone="amber" label="Incoming (with provider)" value={count('processing').length}
          sub={rm(count('processing').reduce((s, p) => s + p.amount_myr, 0))} />
        <Stat icon={Timer} label="Matched vs awaiting" value={`${count('confirmed').length} / ${count('received').length}`}
          sub="Confirmed & matched / waiting for you" />
        <Stat icon={MessageCircleOff} tone="green" label="Enquiries avoided" value={enquiriesAvoided}
          sub="Self-service status checks by families" />
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-title" style={{ flexWrap: 'wrap' }}>
            <h3>Student payments</h3>
            <div className="tabs" role="tablist">
              {FILTERS.map((f) => (
                <button key={f.id} role="tab" aria-selected={filter === f.id} className={`tab ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.label} ({f.id === 'all' ? payments.length : count(f.id).length})
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Date</th><th>Student</th><th>Student ID</th><th>Type</th><th>Invoice</th><th>Amount</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const s = students[p.student_id];
                  const ob = obligations[p.obligation_id];
                  return (
                    <tr key={p.id + p.status} className={Date.now() - new Date(p.updated_at).getTime() < 8000 ? 'flash' : ''}>
                      <td>{date(p.created_at)}</td>
                      <td><Link to={`/payments/${p.id}`}>{s?.full_name}</Link></td>
                      <td className="mono">{s?.student_number}</td>
                      <td>{TYPE_LABEL[p.kind]}</td>
                      <td className="mono">{ob?.invoice_no}</td>
                      <td className="bold">{rm(p.amount_myr)}</td>
                      <td><PaymentChip status={p.status} kind={p.kind} /></td>
                      <td>
                        <StatusActions payment={p} kind={p.kind} role="university" profile={session.profile} compact />
                        {p.status === 'confirmed' && <span className="tiny muted"><BadgeCheck size={14} style={{ verticalAlign: -3 }} /> Done</span>}
                      </td>
                    </tr>
                  );
                })}
                {!shown.length && <tr><td colSpan={8} className="empty">Nothing here right now.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="tiny muted" style={{ marginTop: 12 }}>
            Living-allowance payments go straight to students and are not shown to the university.
          </p>
        </div>
        {!focus && (
          <div className="card">
            <div className="card-title"><h3>Latest updates</h3></div>
            <ActivityList events={events} limit={8} showStudent />
          </div>
        )}
      </div>
    </>
  );
}
