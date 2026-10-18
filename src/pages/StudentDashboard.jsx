import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, CircleDollarSign, Hourglass, Lock, Wallet } from 'lucide-react';
import { ActivityList, ObligationRow, obligationTitle, planTotals } from '../components/PlanParts';
import { Loading, Stat, StatusChip } from '../components/ui';
import { date, firstName, monthYear, rm } from '../lib/format';
import { obligationStatus } from '../lib/rules';
import { familyView, useAuth, useData } from '../lib/store';
import { NoStudent } from './ParentDashboard';

export default function StudentDashboard() {
  const { session } = useAuth();
  const { data, error } = useData();
  if (error) return <p className="error">{error}</p>;
  if (!data) return <Loading />;
  const view = familyView(data, session.profile);
  if (!view) return <NoStudent />;
  const { student, plan, university, obligations, paymentByObligation, events } = view;
  const t = planTotals(obligations, paymentByObligation);
  const allowances = obligations.filter((o) => o.type === 'allowance');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Welcome back, {firstName(session.profile.full_name)}!</h1>
          <p className="muted">Here’s an overview of your semester payments.</p>
        </div>
        <div className="student-chip">
          <div>
            <div className="bold small">{student.full_name}</div>
            <div className="tiny muted">Student ID: {student.student_number}</div>
            <div className="tiny muted">{university?.name}</div>
          </div>
        </div>
      </div>

      <div className="stats">
        <Stat icon={CircleDollarSign} label="Semester total" value={rm(t.total)} sub={plan?.semester_label} />
        <Stat icon={CheckCircle2} tone="green" label="Paid" value={rm(t.paid)} sub={t.inProgress ? `+ ${rm(t.inProgress)} in progress` : 'Confirmed'} />
        <Stat icon={Hourglass} tone="amber" label="Still to come" value={rm(t.outstanding)} />
        <Stat icon={CalendarClock} label="Next item" value={t.next ? date(t.next.due_date) : 'All done'} sub={t.next && obligationTitle(t.next)} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title"><h3>Semester Plan: {plan?.semester_label}</h3></div>
          <div className="ob-list">
            {obligations.filter((o) => o.type !== 'allowance').map((ob) => (
              <ObligationRow key={ob.id} ob={ob} payment={paymentByObligation[ob.id]} role="student" />
            ))}
          </div>
          <div className="card-title" style={{ marginTop: 18 }}>
            <h3>Allowance release schedule</h3>
            <Link to="/student/allowance" className="small">Details →</Link>
          </div>
          <div className="ob-list">
            {allowances.map((ob) => {
              const p = paymentByObligation[ob.id];
              return (
                <div className="ob" key={ob.id}>
                  <span className="icon-bubble green"><Wallet size={20} /></span>
                  <div>
                    <div className="title">{monthYear(ob.due_date)}</div>
                    <div className="small muted">
                      {rm(ob.amount_myr)} ·{' '}
                      {ob.status === 'scheduled' && ob.scheduled_for ? `release set for ${date(ob.scheduled_for)}` : `planned for ${date(ob.due_date)}`}
                    </div>
                  </div>
                  <div className="actions">
                    <StatusChip status={obligationStatus(ob)} />
                    {p && <Link to={`/payments/${p.id}`} className="tiny">Track</Link>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="notice" style={{ marginTop: 14 }}>
            <Lock size={18} />
            <span>
              <strong>Your privacy:</strong> your sponsor can see agreed payments and when allowances are released. EduPilot
              never tracks or shares how you spend your allowance.
            </span>
          </p>
        </div>
        <div className="card">
          <div className="card-title"><h3>Recent Activity</h3><span className="live">Live</span></div>
          <ActivityList events={events} limit={7} />
        </div>
      </div>
    </>
  );
}
