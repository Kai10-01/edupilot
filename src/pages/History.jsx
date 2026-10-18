import { Link } from 'react-router-dom';
import { obligationTitle } from '../components/PlanParts';
import { Loading, PaymentChip } from '../components/ui';
import { date, rm } from '../lib/format';
import { familyView, useAuth, useData } from '../lib/store';
import { NoStudent } from './ParentDashboard';

export default function History() {
  const { session } = useAuth();
  const { data } = useData();
  if (!data) return <Loading />;
  const view = familyView(data, session.profile);
  if (!view) return <NoStudent />;
  const obligationById = Object.fromEntries(view.obligations.map((o) => [o.id, o]));
  const isParent = session.profile.role === 'parent';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payment History</h1>
          <p className="muted">Every payment for {view.student.full_name}, with its receipt.</p>
        </div>
      </div>
      <div className="card">
        {view.payments.length === 0 ? (
          <div className="empty">No payments yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th><th>Item</th><th>Reference</th><th>Amount</th>
                  {isParent && <th>Total paid</th>}<th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {view.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{date(p.created_at)}</td>
                    <td>{obligationTitle(obligationById[p.obligation_id])}</td>
                    <td className="mono">{p.reference}</td>
                    <td>{rm(p.amount_myr)}</td>
                    {isParent && <td>{rm(p.total_myr, { decimals: 2 })}</td>}
                    <td><PaymentChip status={p.status} kind={p.kind} /></td>
                    <td className="row" style={{ gap: 6 }}>
                      <Link className="btn btn-outline btn-sm" to={`/payments/${p.id}`}>Track</Link>
                      <Link className="btn btn-ghost btn-sm" to={`/receipt/${p.id}`}>Receipt</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
