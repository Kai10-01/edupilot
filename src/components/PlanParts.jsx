import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, Send } from 'lucide-react';
import { date, dateTime, monthYear, rm } from '../lib/format';
import { canPay, obligationStatus, stepLabel, todayISO, TYPE_LABEL } from '../lib/rules';
import { StatusChip, TypeIcon, VerifiedBadge } from './ui';

export function obligationTitle(ob) {
  if (!ob) return 'Payment';
  return ob.type === 'allowance' ? `${ob.label} · ${monthYear(ob.due_date)}` : ob.label || TYPE_LABEL[ob.type];
}

export function ObligationRow({ ob, payment, role }) {
  const status = obligationStatus(ob);
  return (
    <div className="ob">
      <TypeIcon type={ob.type} />
      <div style={{ minWidth: 0 }}>
        <div className="title">{obligationTitle(ob)}</div>
        <div className="amount">{rm(ob.amount_myr)}</div>
        <div className="meta">
          <StatusChip status={status} />
          {ob.payee_verified && <VerifiedBadge />}
          <span>
            {status === 'completed' && payment
              ? `Paid ${date(payment.created_at)}`
              : status === 'scheduled' && ob.scheduled_for
                ? `Scheduled for ${date(ob.scheduled_for)}`
                : `Due ${date(ob.due_date)}`}
          </span>
          {ob.type !== 'allowance' && <span className="mono">{ob.invoice_no}</span>}
        </div>
      </div>
      <div className="actions">
        {payment ? (
          <Link className="btn btn-outline btn-sm" to={`/payments/${payment.id}`}>Track payment</Link>
        ) : role === 'parent' && canPay(ob) ? (
          <Link className="btn btn-primary btn-sm" to={`/parent/pay?obligation=${ob.id}`}>Pay now</Link>
        ) : null}
      </div>
    </div>
  );
}

const EVENT_STYLE = {
  initiated: [Send, 'var(--blue-50)', 'var(--blue)'],
  processing: [Clock, 'var(--amber-bg)', 'var(--amber)'],
  received: [Building2, 'var(--blue-50)', 'var(--blue)'],
  confirmed: [CheckCircle2, 'var(--green-bg)', 'var(--green)'],
};

export function ActivityList({ events, limit = 5, showStudent = false }) {
  if (!events.length) return <p className="muted small">No payment activity yet.</p>;
  return (
    <div className="activity">
      {events.slice(0, limit).map((e) => {
        const [Icon, bg, fg] = EVENT_STYLE[e.status];
        return (
          <Link key={e.id} to={`/payments/${e.payment_id}`}>
            <span className="dot" style={{ background: bg, color: fg }}><Icon aria-hidden="true" /></span>
            <div className="spacer" style={{ minWidth: 0 }}>
              <div className="t">
                {obligationTitle(e.obligation)}: {stepLabel(e.status, e.kind).toLowerCase()}
              </div>
              <div className="tiny muted">
                {showStudent && e.studentName ? `${e.studentName} · ` : ''}
                {dateTime(e.created_at)}
              </div>
            </div>
            {e.payment && <span className="small bold">{rm(e.payment.amount_myr)}</span>}
          </Link>
        );
      })}
    </div>
  );
}

// Totals for the four summary cards.
export function planTotals(obligations, paymentByObligation) {
  const today = todayISO();
  const total = obligations.reduce((s, o) => s + o.amount_myr, 0);
  const paid = obligations.filter((o) => o.status === 'completed').reduce((s, o) => s + o.amount_myr, 0);
  const inProgress = obligations.filter((o) => o.status === 'processing').reduce((s, o) => s + o.amount_myr, 0);
  const unpaid = obligations.filter((o) => o.status === 'planned' || o.status === 'scheduled');
  const next = unpaid[0];
  const overdue = unpaid.filter((o) => o.due_date < today).length;
  return { total, paid, inProgress, outstanding: total - paid, next, overdue, payments: Object.keys(paymentByObligation).length };
}
