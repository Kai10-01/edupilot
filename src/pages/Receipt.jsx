import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { obligationTitle } from '../components/PlanParts';
import { FeeBreakdown, Loading, Logo, PaymentChip } from '../components/ui';
import { dateTime } from '../lib/format';
import { methodById, PROVIDER_NAME, stepLabel } from '../lib/rules';
import { paymentView, useData } from '../lib/store';

export default function Receipt() {
  const { id } = useParams();
  const { data } = useData();
  if (!data) return <Loading />;
  const view = paymentView(data, id);
  if (!view) return <div className="card empty">Receipt not found.</div>;
  const { payment, obligation, student, university, events } = view;
  const kind = obligation?.type || payment.kind;

  return (
    <div className="receipt">
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <Link to={`/payments/${id}`} className="small"><ArrowLeft size={14} style={{ verticalAlign: -2 }} /> Back to tracker</Link>
        <div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
      </div>
      <div className="card">
        <div className="receipt-head">
          <div>
            <Logo />
            <p className="small muted" style={{ marginTop: 6 }}>Payment receipt</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <PaymentChip status={payment.status} kind={kind} />
            <div className="tiny muted mono" style={{ marginTop: 6 }}>{payment.reference}</div>
          </div>
        </div>
        <dl className="kv" style={{ marginBottom: 20 }}>
          <dt>Item</dt><dd>{obligationTitle(obligation)}</dd>
          <dt>Payee</dt><dd>{obligation?.payee_name} (verified)</dd>
          <dt>{kind === 'allowance' ? 'Reference' : 'Invoice no.'}</dt><dd className="mono">{obligation?.invoice_no}</dd>
          <dt>Student</dt><dd>{student?.full_name} · {student?.student_number}</dd>
          <dt>University</dt><dd>{university?.name}</dd>
          <dt>Payment method</dt><dd>{methodById(payment.method).label}</dd>
          <dt>Processed by</dt><dd>{PROVIDER_NAME}</dd>
          <dt>Date</dt><dd>{dateTime(payment.created_at)}</dd>
        </dl>
        <h4 style={{ marginBottom: 6 }}>Fee breakdown</h4>
        <FeeBreakdown
          q={{ amount: payment.amount_myr, planFee: payment.plan_fee, providerFee: payment.provider_fee, fxRate: payment.fx_rate,
            currency: payment.payer_currency, totalMyr: payment.total_myr, totalForeign: payment.total_foreign }}
          method={payment.method} payee={obligation?.payee_name} />
        <h4 style={{ margin: '22px 0 8px' }}>Status history</h4>
        <table className="breakdown">
          <tbody>
            {events.map((e) => (
              <tr key={e.id}><td>{stepLabel(e.status, kind)}</td><td>{dateTime(e.created_at)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="tiny muted" style={{ marginTop: 20 }}>
          EduPilot does not hold funds, issue e-money or provide FX. Fee and exchange-rate figures marked “sample” are
          illustrative demo values. This is a student prototype: no real money was moved.
        </p>
      </div>
    </div>
  );
}
