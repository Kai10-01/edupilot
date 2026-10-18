import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Lock, ShieldCheck } from 'lucide-react';
import { obligationTitle } from '../components/PlanParts';
import { FeeBreakdown, Loading, StatusChip, TypeIcon, VerifiedBadge } from '../components/ui';
import { api } from '../lib/api';
import { date, rm } from '../lib/format';
import { canPay, METHODS, obligationStatus, PROVIDER_NAME, quote } from '../lib/rules';
import { familyView, useAuth, useData } from '../lib/store';
import { NoStudent } from './ParentDashboard';

const STEPS = ['Select item', 'Payment details', 'Review & confirm'];

export default function PayFlow() {
  const { session } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselected = params.get('obligation');
  const [step, setStep] = useState(preselected ? 1 : 0);
  const [selectedId, setSelectedId] = useState(preselected);
  const [method, setMethod] = useState('bank');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!data) return <Loading />;
  const view = familyView(data, session.profile);
  if (!view) return <NoStudent />;
  const { student, plan, university, obligations, paymentByObligation } = view;
  const selected = obligations.find((o) => o.id === selectedId && canPay(o));
  const currentStep = selected ? step : 0;
  const q = selected && quote({ amount: selected.amount_myr, planFeePaid: plan.plan_fee_paid, method, currency: session.profile.home_currency });

  async function pay() {
    setBusy(true);
    setError('');
    try {
      const paymentId = await api.makePayment(selected.id, method);
      navigate(`/payments/${paymentId}?new=1`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Make a Payment</h1>
          <p className="muted">For {student.full_name} · {university?.name}</p>
        </div>
        <div className="stepper" aria-label="Progress">
          {STEPS.map((label, i) => (
            <span key={label} className="row" style={{ gap: 8 }}>
              {i > 0 && <span className="line" />}
              <span className={`s ${i === currentStep ? 'on' : i < currentStep ? 'done' : ''}`}>
                <span className="n">{i < currentStep ? <Check size={13} /> : i + 1}</span>
                <span className="hide-mobile">{label}</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      {currentStep === 0 && (
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="card-title"><h3>Select the item you would like to pay</h3></div>
          {obligations.map((ob) => {
            const payable = canPay(ob);
            return (
              <button key={ob.id} className={`select-card ${selectedId === ob.id ? 'selected' : ''}`} disabled={!payable}
                onClick={() => setSelectedId(ob.id)}>
                <TypeIcon type={ob.type} />
                <span style={{ minWidth: 0 }}>
                  <span className="bold" style={{ display: 'block', color: 'var(--navy)' }}>{obligationTitle(ob)}</span>
                  <span className="bold">{rm(ob.amount_myr)}</span>
                  <span className="row wrap small muted" style={{ gap: 8, marginTop: 4 }}>
                    <StatusChip status={obligationStatus(ob)} />
                    {payable ? `Due ${date(ob.due_date)}` : paymentByObligation[ob.id] ? 'Already paid / in progress' : ''}
                  </span>
                </span>
                {payable ? <span className="radio" /> : <span />}
              </button>
            );
          })}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" disabled={!selected} onClick={() => setStep(1)}>Continue</button>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title"><h3>{obligationTitle(selected)}</h3><VerifiedBadge /></div>
            <dl className="kv" style={{ marginBottom: 18 }}>
              <dt>Payee</dt><dd>{selected.payee_name}</dd>
              <dt>{selected.type === 'allowance' ? 'Reference' : 'Invoice no.'}</dt><dd className="mono">{selected.invoice_no}</dd>
              <dt>Student</dt><dd>{student.full_name} ({student.student_number})</dd>
              <dt>Due date</dt><dd>{date(selected.due_date)}</dd>
            </dl>
            <p className="small muted" style={{ marginBottom: 10 }}>
              <ShieldCheck size={14} style={{ verticalAlign: -2 }} /> These details come from {university?.name}. You never need to type bank details.
            </p>
            <h4 style={{ margin: '18px 0 10px' }}>Payment method</h4>
            {METHODS.map((m) => (
              <button key={m.id} className={`select-card ${method === m.id ? 'selected' : ''}`} onClick={() => setMethod(m.id)} style={{ padding: 12 }}>
                <span className="radio" />
                <span>
                  <span className="bold" style={{ display: 'block' }}>{m.label}</span>
                  <span className="small muted">{m.hint}</span>
                </span>
                <span className="small muted">{(m.feeRate * 100).toFixed(1)}% fee</span>
              </button>
            ))}
            <p className="tiny muted">All methods are processed by a {PROVIDER_NAME.toLowerCase()}. EduPilot never holds your money.</p>
          </div>
          <div className="card">
            <div className="card-title"><h3>Fee breakdown</h3><span className="tiny muted">No hidden charges</span></div>
            <FeeBreakdown q={q} method={method} payee={selected.payee_name} />
            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn btn-outline" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</button>
              <div className="spacer" />
              <button className="btn btn-primary" onClick={() => { setAgreed(false); setStep(2); }}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="card" style={{ maxWidth: 720 }}>
          <div className="card-title"><h3>Review & confirm</h3></div>
          <div className="confirm-box">
            You are paying <strong>{rm(q.totalMyr, { decimals: 2 })}</strong> to <strong>{selected.payee_name}</strong>
            {selected.type !== 'allowance' && <>, invoice <strong>{selected.invoice_no}</strong></>}, for{' '}
            <strong>{student.full_name}</strong> ({student.student_number}).
          </div>
          <div style={{ marginTop: 18 }}>
            <FeeBreakdown q={q} method={method} payee={selected.payee_name} />
          </div>
          <label className="check">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>I confirm the payee, invoice and amount are correct. I understand this is a demo and no real money will move.</span>
          </label>
          {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
          <div className="row">
            <button className="btn btn-outline" onClick={() => setStep(1)} disabled={busy}><ArrowLeft size={16} /> Back</button>
            <div className="spacer" />
            <button className="btn btn-primary" disabled={!agreed || busy} onClick={pay}>
              <Lock size={16} /> {busy ? 'Sending…' : `Pay ${rm(q.totalMyr, { decimals: 2 })}`}
            </button>
          </div>
          <p className="tiny muted" style={{ marginTop: 12 }}>Paid via {PROVIDER_NAME}. <Link to="/parent">Cancel</Link></p>
        </div>
      )}
    </>
  );
}
