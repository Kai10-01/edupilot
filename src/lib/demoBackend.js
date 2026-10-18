// Offline "Demo Mode" backend.
// Used automatically when no Supabase keys are set. Data lives in this
// browser's localStorage, and other tabs update live via BroadcastChannel.
// It follows the same rules as supabase/schema.sql so both modes behave alike.
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './demoAccounts';
import { quote } from './rules';

const DATA_KEY = 'edupilot-demo-data-v1';
const SESSION_KEY = 'edupilot-demo-session'; // sessionStorage: one login per tab

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const dayISO = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const ts = (offsetDays, hours = 10, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};
const randomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// ---------- seed ----------
function addPlan(db, student, items) {
  const plan = {
    id: uid(),
    student_id: student.id,
    semester_label: 'September 2026 Semester',
    plan_fee_paid: false,
    created_at: ts(-70),
  };
  db.semester_plans.push(plan);
  const uni = db.universities.find((u) => u.id === student.university_id);
  return items.map((it) => {
    const ob = {
      id: uid(),
      plan_id: plan.id,
      type: it.type,
      label: it.label,
      amount_myr: it.amount,
      due_date: dayISO(it.due),
      invoice_no: it.invoice,
      payee_name:
        it.type === 'tuition'
          ? uni.name
          : it.type === 'accommodation'
            ? uni.name + ' – On-Campus Residence'
            : student.full_name + ' (student account)',
      payee_verified: true,
      status: it.status || 'planned',
      scheduled_for: it.scheduledFor != null ? dayISO(it.scheduledFor) : null,
      created_at: ts(-70),
    };
    db.obligations.push(ob);
    return ob;
  });
}

// Creates a historic payment with a believable timeline (seed data only).
function seedPayment(db, ob, { student, payerId, method, currency, status, createdDaysAgo, hour, checks }) {
  const plan = db.semester_plans.find((p) => p.id === ob.plan_id);
  const q = quote({ amount: ob.amount_myr, planFeePaid: plan.plan_fee_paid, method, currency });
  plan.plan_fee_paid = true;
  const created = new Date(ts(-createdDaysAgo, hour, 12));
  const span = Date.now() - created.getTime();
  const at = (fraction) => new Date(created.getTime() + span * fraction).toISOString();
  const payment = {
    id: uid(),
    obligation_id: ob.id,
    student_id: student.id,
    university_id: student.university_id,
    payer_id: payerId,
    kind: ob.type,
    reference: `EP-${student.student_number}-${randomCode()}`,
    method,
    amount_myr: q.amount,
    plan_fee: q.planFee,
    provider_fee: q.providerFee,
    fx_rate: q.fxRate,
    payer_currency: currency,
    total_myr: q.totalMyr,
    total_foreign: q.totalForeign,
    status,
    status_checks: checks,
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
  };
  db.payments.push(payment);
  const steps = ['initiated', 'processing', 'received', 'confirmed'];
  const times = [created.toISOString(), new Date(created.getTime() + 60000).toISOString(), at(0.5), at(0.75)];
  steps.slice(0, steps.indexOf(status) + 1).forEach((s, i) => {
    db.payment_events.push({
      id: uid(),
      payment_id: payment.id,
      student_id: student.id,
      kind: ob.type,
      status: s,
      note: eventNote(s, ob, student),
      created_at: times[i],
    });
  });
  payment.updated_at = times[steps.indexOf(status)];
  ob.status = status === 'confirmed' ? 'completed' : 'processing';
  return payment;
}

function eventNote(status, ob, student) {
  const allowance = ob.type === 'allowance';
  switch (status) {
    case 'initiated':
      return 'Payment instruction created by sponsor';
    case 'processing':
      return 'Sent to licensed payment provider (demo)';
    case 'received':
      return allowance ? 'Released to student account' : 'Funds received by university finance office';
    case 'confirmed':
      return allowance
        ? 'Student confirmed the allowance arrived'
        : `Matched to invoice ${ob.invoice_no} and student ${student.student_number}`;
    default:
      return '';
  }
}

function sandboxItems(studentNumber) {
  const n = studentNumber.slice(-4);
  return [
    { type: 'tuition', label: 'Tuition fee', amount: 18000, due: 21, invoice: `INV-2026-${n}` },
    { type: 'accommodation', label: 'Accommodation fee', amount: 6000, due: 10, invoice: `ACC-2026-${n}` },
    ...[5, 35, 65, 95].map((due, i) => ({
      type: 'allowance',
      label: 'Living allowance',
      amount: 1000,
      due,
      invoice: `ALW-${studentNumber}-${i + 1}`,
    })),
  ];
}

function buildSeed() {
  const db = {
    users: [],
    profiles: [],
    universities: [],
    students: [],
    semester_plans: [],
    obligations: [],
    payments: [],
    payment_events: [],
  };
  const uni = { id: uid(), name: 'Sunway University', verified: true, created_at: ts(-400) };
  db.universities.push(uni);

  const ids = {};
  for (const acc of DEMO_ACCOUNTS) {
    const id = uid();
    ids[acc.role] = id;
    db.users.push({ id, email: acc.email, password: DEMO_PASSWORD });
    db.profiles.push({
      id,
      full_name: acc.name,
      role: acc.role,
      university_id: acc.role === 'university' ? uni.id : null,
      home_currency: 'CNY',
      created_at: ts(-80),
    });
  }

  // Emily – the main demo student
  const emily = {
    id: uid(),
    profile_id: ids.student,
    full_name: 'Emily Tan',
    student_number: 'S1234567',
    programme: 'BSc (Hons) Business Analytics',
    university_id: uni.id,
    sponsor_profile_id: ids.parent,
    created_at: ts(-80),
  };
  db.students.push(emily);
  const [tuition, , allowance1] = addPlan(db, emily, [
    { type: 'tuition', label: 'Tuition fee', amount: 18000, due: -55, invoice: 'INV-2026-10452' },
    { type: 'accommodation', label: 'Accommodation fee', amount: 6000, due: 12, invoice: 'ACC-2026-0381', status: 'scheduled', scheduledFor: 10 },
    { type: 'allowance', label: 'Living allowance', amount: 1000, due: -17, invoice: 'ALW-S1234567-1' },
    { type: 'allowance', label: 'Living allowance', amount: 1000, due: 13, invoice: 'ALW-S1234567-2', status: 'scheduled', scheduledFor: 13 },
    { type: 'allowance', label: 'Living allowance', amount: 1000, due: 43, invoice: 'ALW-S1234567-3' },
    { type: 'allowance', label: 'Living allowance', amount: 1000, due: 73, invoice: 'ALW-S1234567-4' },
  ]);
  seedPayment(db, tuition, { student: emily, payerId: ids.parent, method: 'bank', currency: 'CNY', status: 'confirmed', createdDaysAgo: 58, hour: 9, checks: 4 });
  seedPayment(db, allowance1, { student: emily, payerId: ids.parent, method: 'ewallet', currency: 'CNY', status: 'confirmed', createdDaysAgo: 18, hour: 20, checks: 1 });

  // Other students so the university dashboard looks realistic.
  const others = [
    ['Ali Khan', 'S2345678', 'tuition', 18000, 'confirmed', 6, 'IDR', 3],
    ['Siti Rahman', 'S3456789', 'tuition', 18000, 'received', 1, 'IDR', 2],
    ['Chen Wei', 'S4567890', 'accommodation', 6000, 'processing', 0, 'CNY', 1],
    ['Maria Santos', 'S5678901', 'accommodation', 6000, 'confirmed', 9, 'USD', 5],
    ['Priya Nair', 'S6789012', 'tuition', 21500, 'processing', 1, 'INR', 2],
    ['Ahmed Hassan', 'S7890123', 'tuition', 18000, 'received', 2, 'GBP', 3],
  ];
  others.forEach(([name, num, type, amount, status, daysAgo, currency, checks], i) => {
    const s = {
      id: uid(),
      profile_id: null,
      full_name: name,
      student_number: num,
      programme: null,
      university_id: uni.id,
      sponsor_profile_id: null,
      created_at: ts(-80),
    };
    db.students.push(s);
    const [ob] = addPlan(db, s, [
      { type, label: type === 'tuition' ? 'Tuition fee' : 'Accommodation fee', amount, due: 14 - daysAgo, invoice: `${type === 'tuition' ? 'INV' : 'ACC'}-2026-${10460 + i}` },
    ]);
    seedPayment(db, ob, { student: s, payerId: null, method: 'bank', currency, status, createdDaysAgo: daysAgo, hour: daysAgo === 0 ? new Date().getHours() : 11, checks });
  });
  return db;
}

// ---------- storage + live updates ----------
const listeners = new Set();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('edupilot-demo') : null;
if (channel) channel.onmessage = () => listeners.forEach((fn) => fn());

function read() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to a fresh seed */
  }
  const db = buildSeed();
  localStorage.setItem(DATA_KEY, JSON.stringify(db));
  return db;
}

function write(db) {
  localStorage.setItem(DATA_KEY, JSON.stringify(db));
  listeners.forEach((fn) => fn());
  channel?.postMessage('changed');
}

function currentUserId() {
  return sessionStorage.getItem(SESSION_KEY);
}

function requireProfile(db) {
  const profile = db.profiles.find((p) => p.id === currentUserId());
  if (!profile) throw new Error('Please log in again.');
  return profile;
}

// Same rule as can_see_item() in schema.sql (Row Level Security).
function canSee(db, profile, studentId, kind) {
  const s = db.students.find((x) => x.id === studentId);
  if (!s) return false;
  if (s.profile_id === profile.id || s.sponsor_profile_id === profile.id) return true;
  return profile.role === 'university' && profile.university_id === s.university_id && kind !== 'allowance';
}

const authListeners = new Set();
const notifyAuth = () => authListeners.forEach((fn) => setTimeout(fn, 0));

export const demoApi = {
  async getSession() {
    const db = read();
    const profile = db.profiles.find((p) => p.id === currentUserId());
    if (!profile) return null;
    const user = db.users.find((u) => u.id === profile.id);
    return { user: { id: user.id, email: user.email }, profile };
  },

  async signIn(email, password) {
    const db = read();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) throw new Error('Incorrect email or password.');
    sessionStorage.setItem(SESSION_KEY, user.id);
    notifyAuth();
  },

  async signUp({ email, password, fullName, role, homeCurrency, studentName }) {
    const db = read();
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw new Error('An account with this email already exists.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const safeRole = role === 'student' ? 'student' : 'parent';
    const id = uid();
    db.users.push({ id, email: email.trim(), password });
    db.profiles.push({ id, full_name: fullName, role: safeRole, university_id: null, home_currency: homeCurrency || 'CNY', created_at: new Date().toISOString() });
    // Every new family gets a sandbox Semester Plan to try the app with.
    const uni = db.universities[0];
    const number = 'S' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0');
    const student = {
      id: uid(),
      profile_id: safeRole === 'student' ? id : null,
      full_name: safeRole === 'student' ? fullName : studentName || 'Your student (sandbox)',
      student_number: number,
      programme: 'Sandbox programme',
      university_id: uni.id,
      sponsor_profile_id: safeRole === 'parent' ? id : null,
      created_at: new Date().toISOString(),
    };
    db.students.push(student);
    addPlan(db, student, sandboxItems(number));
    sessionStorage.setItem(SESSION_KEY, id);
    write(db);
    notifyAuth();
    return { needsConfirmation: false };
  },

  async signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    notifyAuth();
  },

  onAuthChange(cb) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },

  async loadAll() {
    const db = read();
    const profile = requireProfile(db);
    const students = db.students.filter((s) => canSee(db, profile, s.id));
    const studentIds = new Set(students.map((s) => s.id));
    const plans = db.semester_plans.filter((p) => studentIds.has(p.student_id));
    const planStudent = Object.fromEntries(plans.map((p) => [p.id, p.student_id]));
    return {
      universities: db.universities,
      students,
      semester_plans: plans,
      obligations: db.obligations.filter((o) => planStudent[o.plan_id] && canSee(db, profile, planStudent[o.plan_id], o.type)),
      payments: db.payments.filter((p) => canSee(db, profile, p.student_id, p.kind)),
      payment_events: db.payment_events.filter((e) => canSee(db, profile, e.student_id, e.kind)),
    };
  },

  async makePayment(obligationId, method) {
    const db = read();
    const profile = requireProfile(db);
    if (profile.role !== 'parent') throw new Error('Only the family sponsor can make payments.');
    const ob = db.obligations.find((o) => o.id === obligationId);
    if (!ob) throw new Error('Payment item not found.');
    const plan = db.semester_plans.find((p) => p.id === ob.plan_id);
    const student = db.students.find((s) => s.id === plan.student_id);
    if (student.sponsor_profile_id !== profile.id) throw new Error('You are not the sponsor for this student.');
    if (ob.status === 'processing' || ob.status === 'completed') throw new Error('This item is already paid or in progress.');
    const q = quote({ amount: ob.amount_myr, planFeePaid: plan.plan_fee_paid, method, currency: profile.home_currency });
    plan.plan_fee_paid = true;
    const now = new Date();
    const payment = {
      id: uid(),
      obligation_id: ob.id,
      student_id: student.id,
      university_id: student.university_id,
      payer_id: profile.id,
      kind: ob.type,
      reference: `EP-${student.student_number}-${randomCode()}`,
      method,
      amount_myr: q.amount,
      plan_fee: q.planFee,
      provider_fee: q.providerFee,
      fx_rate: q.fxRate,
      payer_currency: profile.home_currency,
      total_myr: q.totalMyr,
      total_foreign: q.totalForeign,
      status: 'processing',
      status_checks: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    db.payments.push(payment);
    ['initiated', 'processing'].forEach((s, i) =>
      db.payment_events.push({
        id: uid(),
        payment_id: payment.id,
        student_id: student.id,
        kind: ob.type,
        status: s,
        note: eventNote(s, ob, student),
        created_at: new Date(now.getTime() + i).toISOString(),
      }),
    );
    ob.status = 'processing';
    write(db);
    return payment.id;
  },

  async advancePayment(paymentId, nextStatus) {
    const db = read();
    const profile = requireProfile(db);
    const p = db.payments.find((x) => x.id === paymentId);
    if (!p) throw new Error('Payment not found.');
    const ob = db.obligations.find((o) => o.id === p.obligation_id);
    const student = db.students.find((s) => s.id === p.student_id);
    if (ob.type === 'allowance') {
      if (student.profile_id !== profile.id) throw new Error('Only the student can confirm an allowance release.');
    } else if (profile.role !== 'university' || profile.university_id !== p.university_id) {
      throw new Error('Only the university finance office can update this payment.');
    }
    const ok = (p.status === 'processing' && nextStatus === 'received') || (p.status === 'received' && nextStatus === 'confirmed');
    if (!ok) throw new Error('This status change is not allowed.');
    p.status = nextStatus;
    p.updated_at = new Date().toISOString();
    db.payment_events.push({
      id: uid(),
      payment_id: p.id,
      student_id: p.student_id,
      kind: p.kind,
      status: nextStatus,
      note: eventNote(nextStatus, ob, student),
      created_at: p.updated_at,
    });
    if (nextStatus === 'confirmed') ob.status = 'completed';
    write(db);
  },

  async schedulePayment(obligationId, dateISO) {
    const db = read();
    const profile = requireProfile(db);
    const ob = db.obligations.find((o) => o.id === obligationId);
    const plan = db.semester_plans.find((p) => p.id === ob?.plan_id);
    const student = db.students.find((s) => s.id === plan?.student_id);
    if (!student || student.sponsor_profile_id !== profile.id) throw new Error('Only the sponsor can schedule this item.');
    if (ob.status !== 'planned' && ob.status !== 'scheduled') throw new Error('This item is already paid or in progress.');
    ob.scheduled_for = dateISO || null;
    ob.status = dateISO ? 'scheduled' : 'planned';
    write(db);
  },

  async logStatusCheck(paymentId) {
    const db = read();
    const profile = requireProfile(db);
    const p = db.payments.find((x) => x.id === paymentId);
    if (!p || profile.role === 'university' || !canSee(db, profile, p.student_id, p.kind)) return;
    p.status_checks += 1;
    write(db);
  },

  subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  resetDemo() {
    localStorage.removeItem(DATA_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    read();
    channel?.postMessage('changed');
    notifyAuth();
  },
};
