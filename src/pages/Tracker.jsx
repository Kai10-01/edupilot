import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Printer } from 'lucide-react';
import { obligationTitle } from '../components/PlanParts';
import { FeeBreakdown, Loading, PaymentChip, Timeline, VerifiedBadge } from '../components/ui';
import { api } from '../lib/api';
import { date, rm } from '../lib/format';
import { methodById, PROVIDER_NAME } from '../lib/rules';
import { paymentView, useAuth, useData } from '../lib/store';

const logged = new Set(); // count each "status check" once per visit

export default function Tracker() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const { data } = useData();
  const role = session.profile.role;

  useEffect(() => {
    // Every time a family checks status here instead of emailing the
    // university, it counts as an enquiry avoided (shown to the university).
    if (role !== 'university' && !logged.has(id)) {
      logged.add(id);
      api.logStatusCheck(id);
    }
  }, [id, role]);

  if (!data) return <Loading />;
  const view = paymentView(data, id);
  if (!view) return <div className="card empty">Payment not found, or you don’t have access to it.</div>;
  const { payment, obligation, student, university, events } = view;
  const kind = obligation?.type || payment.kind;

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={`/${role}`} className="small"><ArrowLeft size={14} style={{ verticalAlign: -2 }} /> Back to dashboard</Link>
          <h1 style={{ marginTop: 8 }}>Payment Tracker</h1>
          <p className="muted">{obligationTitle(obligation)} for {student?.full_name}</p>
        </div>
        <span className="live">Live status: updates automatically</span>
      </div>

      {params.get('new') && (
        <p className="notice success" style={{ marginBottom: 18 }}>
          <CheckCircle2 size={18} />
          <span>
            Payment sent to the {PROVIDER_NAME.toLowerCase()}. Keep this page open: it updates by itself as soon as{' '}
            {kind === 'allowance' ? 'the allowance is released' : `${university?.name} receives the funds`}.
          </span>
        </p>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <div>
              <h3>{rm(payment.amount_myr)} · {obligationTitle(obligation)}</h3>
              <div className="tiny muted mono" style={{ marginTop: 4 }}>Ref {payment.reference}</div>
            </div>
            <PaymentChip status={payment.status} kind={kind} />
          </div>
          <Timeline payment={payment} events={events} type={kind} />
          <StatusActions payment={payment} kind={kind} role={role} student={student} profile={session.profile} />
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-title"><h3>Payment details</h3><VerifiedBadge /></div>
            <dl className="kv">
              <dt>Payee</dt><dd>{obligation?.payee_name}</dd>
              <dt>{kind === 'allowance' ? 'Reference' : 'Invoice no.'}</dt><dd className="mono">{obligation?.invoice_no}</dd>
              <dt>Student</dt><dd>{student?.full_name} ({student?.student_number})</dd>
              <dt>University</dt><dd>{university?.name}</dd>
              <dt>Payment reference</dt><dd className="mono">{payment.reference}</dd>
              <dt>Method</dt><dd>{methodById(payment.method).label}, via {PROVIDER_NAME}</dd>
              <dt>Initiated</dt><dd>{date(payment.created_at)}</dd>
            </dl>
          </div>
          {role !== 'university' && (
            <div className="card">
              <div className="card-title"><h3>Fees</h3></div>
              <FeeBreakdown
                q={{ amount: payment.amount_myr, planFee: payment.plan_fee, providerFee: payment.provider_fee, fxRate: payment.fx_rate,
                  currency: payment.payer_currency, totalMyr: payment.total_myr, totalForeign: payment.total_foreign }}
                method={payment.method} payee={obligation?.payee_name} />
              <Link className="btn btn-outline btn-block" style={{ marginTop: 16 }} to={`/receipt/${payment.id}`}>
                <Printer size={16} /> View / print receipt
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// The buttons that move a payment along its timeline (simulated – no real money).
export function StatusActions({ payment, kind, role, student, profile, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  let buttons = null;
  if (role === 'university' && kind !== 'allowance') {
    if (payment.status === 'processing')
      buttons = <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(() => api.advancePayment(payment.id, 'received'))}>Mark received</button>;
    else if (payment.status === 'received')
      buttons = <button className="btn btn-success btn-sm" disabled={busy} onClick={() => run(() => api.advancePayment(payment.id, 'confirmed'))}>Confirm & match</button>;
  }
  if (role === 'student' && kind === 'allowance' && student?.profile_id === profile.id && payment.status !== 'confirmed') {
    buttons = (
      <button className="btn btn-success btn-sm" disabled={busy}
        onClick={() => run(async () => {
          if (payment.status === 'processing') await api.advancePayment(payment.id, 'received');
          await api.advancePayment(payment.id, 'confirmed');
        })}>
        I’ve received it
      </button>
    );
  }
  if (!buttons) return null;
  if (compact) return <>{buttons}{error && <div className="tiny" style={{ color: 'var(--red)' }}>{error}</div>}</>;
  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div className="row wrap">
        <span className="small muted spacer">
          {role === 'university' ? 'Finance office action (demo):' : 'Has the allowance reached your account?'}
        </span>
        {buttons}
      </div>
      {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}
    </div>
  );
}
