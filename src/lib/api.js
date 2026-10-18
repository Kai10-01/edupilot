// One API for the whole app. If Supabase keys are set (see .env.example)
// it talks to Supabase; otherwise it falls back to the offline Demo Mode.
import { createClient } from '@supabase/supabase-js';
import { demoApi } from './demoBackend';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isDemoMode = !(url && key);

// sessionStorage = each browser tab keeps its own login, so you can show the
// parent and the university side by side in two tabs during the presentation.
const supabase = isDemoMode
  ? null
  : createClient(url, key, { auth: { storage: window.sessionStorage, persistSession: true } });

function friendly(error) {
  const msg = error?.message || String(error);
  if (/Invalid login credentials/i.test(msg)) return new Error('Incorrect email or password.');
  if (/Email not confirmed/i.test(msg)) return new Error('Please confirm your email first (check your inbox).');
  if (/already registered/i.test(msg)) return new Error('An account with this email already exists.');
  return new Error(msg);
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw friendly(error);
  return data;
}

const supabaseApi = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw friendly(error);
    return { user: { id: user.id, email: user.email }, profile };
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw friendly(error);
  },

  async signUp({ email, password, fullName, role, homeCurrency, studentName }) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName, role, home_currency: homeCurrency, student_name: studentName } },
    });
    if (error) throw friendly(error);
    return { needsConfirmation: !data.session };
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  onAuthChange(cb) {
    // setTimeout avoids calling Supabase from inside its own auth callback.
    const { data } = supabase.auth.onAuthStateChange(() => setTimeout(cb, 0));
    return () => data.subscription.unsubscribe();
  },

  // Row Level Security decides which rows each role gets back.
  async loadAll() {
    const tables = ['universities', 'students', 'semester_plans', 'obligations', 'payments', 'payment_events'];
    const results = await Promise.all(tables.map((t) => supabase.from(t).select('*')));
    const out = {};
    results.forEach((r, i) => {
      if (r.error) throw friendly(r.error);
      out[tables[i]] = r.data;
    });
    for (const o of out.obligations) o.amount_myr = Number(o.amount_myr);
    for (const p of out.payments)
      for (const k of ['amount_myr', 'plan_fee', 'provider_fee', 'fx_rate', 'total_myr', 'total_foreign']) p[k] = Number(p[k]);
    return out;
  },

  makePayment: (obligationId, method) => rpc('make_payment', { p_obligation_id: obligationId, p_method: method }),
  advancePayment: (paymentId, status) => rpc('advance_payment', { p_payment_id: paymentId, p_status: status }),
  schedulePayment: (obligationId, dateISO) => rpc('schedule_payment', { p_obligation_id: obligationId, p_date: dateISO || null }),
  logStatusCheck: (paymentId) => rpc('log_status_check', { p_payment_id: paymentId }).catch(() => {}),

  // Supabase Realtime: any change to these tables triggers a refresh.
  subscribe(cb) {
    const channel = supabase.channel('edupilot-live-' + Math.random().toString(36).slice(2));
    for (const table of ['payments', 'payment_events', 'obligations', 'semester_plans'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => cb());
    channel.subscribe();
    return () => supabase.removeChannel(channel);
  },
};

export const api = isDemoMode ? demoApi : supabaseApi;
