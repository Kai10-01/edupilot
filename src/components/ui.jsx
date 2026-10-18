import { Link } from 'react-router-dom';
import {
  ArrowRight, Building2, CalendarClock, Check, CheckCircle2, Circle, Clock, Home, Loader2,
  Send, ShieldCheck, TriangleAlert, Wallet, X,
} from 'lucide-react';
import { isDemoMode } from '../lib/api';
import { demoApi } from '../lib/demoBackend';
import { dateTime, foreign, rm } from '../lib/format';
import { currencyLabel, methodById, PAYMENT_STEPS, PROVIDER_NAME, stepHint, stepLabel } from '../lib/rules';

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="EduPilot home">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M3 15 29 4l-8.5 23.5-5.5-9L3 15Z" fill="#1E4FC2" />
        <path d="m15 18.5 6-9.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M15 18.5 13.8 25l3.7-3" fill="#0B2A6B" />
      </svg>
      EduPilot
    </Link>
  );
}

const CHIP = {
  completed: { label: 'Completed', Icon: Check },
  scheduled: { label: 'Scheduled', Icon: ArrowRight },
  planned: { label: 'Planned', Icon: Circle },
  processing: { label: 'In progress', Icon: Loader2 },
  overdue: { label: 'Overdue', Icon: TriangleAlert },
};

export function StatusChip({ status }) {
  const { label, Icon } = CHIP[status] || CHIP.planned;
  return (
    <span className={`chip chip-${status}`}>
      <Icon aria-hidden="true" /> {label}
    </span>
  );
}

const PAYMENT_CHIP = { initiated: 'processing', processing: 'processing', received: 'scheduled', confirmed: 'completed' };
const PAYMENT_LABEL = { initiated: 'Initiated', processing: 'Processing', received: 'Received', confirmed: 'Confirmed' };
export function PaymentChip({ status, kind }) {
  const label = kind === 'allowance' && status === 'received' ? 'Released' : PAYMENT_LABEL[status];
  return <span className={`chip chip-${PAYMENT_CHIP[status]}`}>{label}</span>;
}

export function VerifiedBadge() {
  return (
    <span className="chip chip-verified" title="Payee and invoice supplied by the university – you never type bank details">
      <ShieldCheck aria-hidden="true" /> Verified payee
    </span>
  );
}

export function SampleTag() {
  return <span className="chip chip-sample">sample</span>;
}

export function TypeIcon({ type, size = 44 }) {
  const Icon = type === 'tuition' ? Building2 : type === 'accommodation' ? Home : Wallet;
  const tone = type === 'allowance' ? 'green' : '';
  return (
    <span className={`icon-bubble ${tone}`} style={{ width: size, height: size }}>
      <Icon size={size / 2} aria-hidden="true" />
    </span>
  );
}

export function Stat({ icon: Icon, label, value, sub, tone = '' }) {
  return (
    <div className="card stat">
      <span className={`icon-bubble ${tone}`}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <div>
        <div className="label">{label}</div>
        <div className="value">{value}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
    </div>
  );
}

const STEP_ICON = { initiated: Send, processing: Clock, received: Building2, confirmed: CheckCircle2 };

export function Timeline({ payment, events, type }) {
  const reachedIndex = PAYMENT_STEPS.indexOf(payment.status);
  return (
    <ol className="timeline">
      {PAYMENT_STEPS.map((step, i) => {
        const event = events.find((e) => e.status === step);
        const state = i <= reachedIndex ? 'done' : i === reachedIndex + 1 ? 'current' : 'pending';
        const Icon = state === 'done' ? Check : STEP_ICON[step];
        return (
          <li key={step} className={state}>
            <span className="node">
              <Icon aria-hidden="true" />
            </span>
            <div>
              <div className="step-title">{stepLabel(step, type)}</div>
              <div className="when">
                {event ? dateTime(event.created_at) : state === 'current' ? 'Waiting for this step…' : 'Not yet'}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {event?.note || stepHint(step, type)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// The full fee breakdown – shown before paying and again on the receipt.
export function FeeBreakdown({ q, method, payee }) {
  return (
    <table className="breakdown">
      <tbody>
        <tr>
          <td>
            Obligation amount
            <span className="who">Paid to {payee}</span>
          </td>
          <td>{rm(q.amount, { decimals: 2 })}</td>
        </tr>
        <tr>
          <td>
            EduPilot Semester Plan fee
            <span className="who">
              {q.planFee ? 'RM129, charged once per semester' : 'Already paid this semester – not charged again'}
            </span>
          </td>
          <td>{rm(q.planFee, { decimals: 2 })}</td>
        </tr>
        <tr>
          <td>
            Provider transfer fee <SampleTag />
            <span className="who">
              Charged by the {PROVIDER_NAME.toLowerCase()}, not EduPilot · {methodById(method).label}{' '}
              {(methodById(method).feeRate * 100).toFixed(1)}%
            </span>
          </td>
          <td>{rm(q.providerFee, { decimals: 2 })}</td>
        </tr>
        <tr className="total">
          <td>Total payable</td>
          <td>{rm(q.totalMyr, { decimals: 2 })}</td>
        </tr>
        <tr>
          <td>
            You pay in {currencyLabel(q.currency)} <SampleTag />
            <span className="who">
              Exchange rate set by the licensed provider: RM 1 = {currencyLabel(q.currency)} {q.fxRate}
            </span>
          </td>
          <td>≈ {foreign(q.totalForeign, q.currency)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function Toasts({ toasts, onDismiss, onOpen }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.status}`} role="status">
          <span className="dot" style={{ background: 'var(--blue-50)', color: 'var(--blue)' }}>
            <CalendarClock aria-hidden="true" />
          </span>
          <div style={{ cursor: 'pointer', minWidth: 0 }} onClick={() => onOpen(t.paymentId)}>
            <div className="bold small">{t.title}</div>
            <div className="small">{t.body}</div>
            {t.reference && <div className="tiny muted mono">{t.reference}</div>}
          </div>
          <button className="x" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div className="demo-banner">
      Offline demo mode: data is saved in this browser only. Connect Supabase to sync across devices.
      <button
        onClick={() => {
          if (confirm('Reset all demo data back to the starting sample?')) demoApi.resetDemo();
        }}
      >
        Reset demo data
      </button>
    </div>
  );
}

export function Loading() {
  return (
    <div className="empty">
      <Loader2 className="spin" aria-hidden="true" /> Loading…
    </div>
  );
}
