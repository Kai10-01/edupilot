// App-wide state: who is logged in, and the live payment data.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { stepLabel, TYPE_LABEL } from './rules';

const AuthContext = createContext(null);
const DataContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading

  const refresh = useCallback(async () => {
    try {
      setSession(await api.getSession());
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    return api.onAuthChange(refresh);
  }, [refresh]);

  return <AuthContext.Provider value={{ session, refresh }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function DataProvider({ profile, children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);
  const seen = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api.loadAll();
      announceNewEvents(d);
      setData(d);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Pop a toast for every status change we have not seen yet.
  function announceNewEvents(d) {
    const ids = new Set(d.payment_events.map((e) => e.id));
    if (seen.current) {
      const fresh = d.payment_events.filter((e) => !seen.current.has(e.id));
      const newToasts = fresh.map((e) => {
        const payment = d.payments.find((p) => p.id === e.payment_id);
        const student = d.students.find((s) => s.id === e.student_id);
        return {
          id: e.id,
          paymentId: e.payment_id,
          title: `${TYPE_LABEL[e.kind] || 'Payment'} · ${student?.full_name ?? ''}`,
          body: stepLabel(e.status, e.kind),
          status: e.status,
          reference: payment?.reference,
        };
      });
      if (newToasts.length) {
        setToasts((t) => [...t, ...newToasts].slice(-3));
        newToasts.forEach((toast) => setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 6000));
      }
    }
    seen.current = ids;
  }

  useEffect(() => {
    load();
    let timer;
    const unsubscribe = api.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(load, 150);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [load, profile.id]);

  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <DataContext.Provider value={{ data, error, reload: load, toasts, dismissToast }}>{children}</DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);

// ---------- selectors: turn raw tables into what a page needs ----------
const byDateDesc = (a, b) => (a.created_at < b.created_at ? 1 : -1);

export function familyView(data, profile) {
  if (!data) return null;
  const student = data.students.find((s) =>
    profile.role === 'parent' ? s.sponsor_profile_id === profile.id : s.profile_id === profile.id,
  );
  if (!student) return null;
  const plan = data.semester_plans.filter((p) => p.student_id === student.id).sort(byDateDesc)[0];
  const university = data.universities.find((u) => u.id === student.university_id);
  const obligations = data.obligations
    .filter((o) => o.plan_id === plan?.id)
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1));
  const payments = data.payments.filter((p) => p.student_id === student.id).sort(byDateDesc);
  const paymentByObligation = Object.fromEntries(payments.map((p) => [p.obligation_id, p]));
  const obligationById = Object.fromEntries(obligations.map((o) => [o.id, o]));
  const events = data.payment_events
    .filter((e) => e.student_id === student.id)
    .sort(byDateDesc)
    .map((e) => {
      const payment = payments.find((p) => p.id === e.payment_id);
      return { ...e, payment, obligation: payment && obligationById[payment.obligation_id] };
    });
  return { student, plan, university, obligations, payments, paymentByObligation, events };
}

export function paymentView(data, paymentId) {
  if (!data) return null;
  const payment = data.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  const obligation = data.obligations.find((o) => o.id === payment.obligation_id);
  const student = data.students.find((s) => s.id === payment.student_id);
  const university = data.universities.find((u) => u.id === payment.university_id);
  const plan = data.semester_plans.find((p) => p.id === obligation?.plan_id);
  const events = data.payment_events
    .filter((e) => e.payment_id === paymentId)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  return { payment, obligation, student, university, plan, events };
}
