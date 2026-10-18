import { Link } from 'react-router-dom';
import { CalendarClock, CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, History, Hourglass, Info } from 'lucide-react';
import { ActivityList, ObligationRow, obligationTitle, planTotals } from '../components/PlanParts';
import { Loading, Stat } from '../components/ui';
import { date, initials, rm } from '../lib/format';
import { PLAN_FEE } from '../lib/rules';
import { familyView, useAuth, useData } from '../lib/store';

export default function ParentDashboard() {
  const { session } = useAuth();
  const { data, error } = useData();
  if (error) return <p className="error">{error}</p>;
  if (!data) return <Loading />;
  const view = familyView(data, session.profile);
  if (!view) return <NoStudent />;

  const { student, plan, university, obligations, paymentByObligation, events } = view;
  const t = planTotals(obligations, paymentByObligation);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Welcome, {session.profile.full_name}!</h1>
          <p className="muted">Here’s an overview of your child’s education payments.</p>
        </div>
        <div className="student-chip">
          <span className="avatar" style={{ background: 'var(--blue)' }}>{initials(student.full_name)}</span>
          <div>
            <div className="bold small">{student.full_name}</div>
            <div className="tiny muted">{university?.name}</div>
            <div className="tiny muted">Student ID: {student.student_number}</div>
          </div>
        </div>
      </div>

      <div className="stats">
        <Stat icon={CircleDollarSign} label="Total due this semester" value={rm(t.total)} sub={plan?.semester_label} />
        <Stat icon={CheckCircle2} tone="green" label="Paid" value={rm(t.paid)}
          sub={t.inProgress ? `+ ${rm(t.inProgress)} in progress` : 'Confirmed by payee'} />
        <Stat icon={Hourglass} tone="amber" label="Outstanding" value={rm(t.outstanding)}
          sub={t.overdue ? `${t.overdue} item(s) overdue` : 'Nothing overdue'} />
        <Stat icon={CalendarClock} label="Next due date" value={t.next ? date(t.next.due_date) : 'All paid'}
          sub={t.next ? `${obligationTitle(t.next)} · ${rm(t.next.amount_myr)}` : 'Nothing left to pay'} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <h3>Semester Plan: {plan?.semester_label}</h3>
            <Link to="/parent/pay" className="small">Make a payment →</Link>
          </div>
          <div className="ob-list">
            {obligations.map((ob) => (
              <ObligationRow key={ob.id} ob={ob} payment={paymentByObligation[ob.id]} role="parent" />
            ))}
          </div>
          <p className="notice" style={{ marginTop: 14 }}>
            <Info size={18} />
            <span>
              {plan?.plan_fee_paid
                ? `Your EduPilot Semester Plan fee (RM${PLAN_FEE}) is paid for this semester.`
                : `The EduPilot Semester Plan fee (RM${PLAN_FEE}, once per semester) will be added to your first payment.`}{' '}
              You see when allowances are released, but never how your student spends them.
            </span>
          </p>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-title">
              <h3>Recent Activity</h3>
              <span className="live">Live</span>
            </div>
            <ActivityList events={events} />
          </div>
          <div className="card">
            <div className="card-title"><h3>Quick Actions</h3></div>
            <div className="quick">
              <Link to="/parent/pay"><CreditCard size={18} /> Make a payment</Link>
              <Link to="/parent/allowance"><CalendarDays size={18} /> Schedule allowance releases</Link>
              <Link to="/parent/history"><History size={18} /> Payment history & receipts</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function NoStudent() {
  return (
    <div className="card empty">
      <h3>No Semester Plan linked yet</h3>
      <p style={{ marginTop: 8 }}>
        Your university links your Semester Plan to your account. In the meantime, try one of the demo accounts.
      </p>
    </div>
  );
}
