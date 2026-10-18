// Business rules shared by the whole app.
// The same numbers are repeated in supabase/schema.sql (make_payment) –
// if you change a fee here, change it there too.

// From Colin's BMC: families pay RM129 per Semester Plan.
export const PLAN_FEE = 129;

// SAMPLE values only – not from Colin's files. A real licensed provider
// would quote its own fee and exchange rate.
export const METHODS = [
  { id: 'bank', label: 'Bank transfer', hint: 'Local or international bank transfer', feeRate: 0.005 },
  { id: 'card', label: 'Credit / Debit card', hint: 'Visa, Mastercard, UnionPay', feeRate: 0.015 },
  { id: 'ewallet', label: 'E-wallet', hint: 'Alipay, GrabPay and similar', feeRate: 0.008 },
];

// SAMPLE exchange rates: 1 MYR = x units of the payer's home currency.
export const FX_RATES = {
  CNY: 1.65,
  IDR: 3720,
  INR: 19.8,
  USD: 0.23,
  GBP: 0.18,
};

export const CURRENCIES = Object.keys(FX_RATES);
// What the user sees on screen. The code on the left stays the same
// (it is what the database stores); only the name on the right is shown.
export const CURRENCY_LABEL = {
  CNY: 'RMB',
  IDR: 'IDR',
  INR: 'INR',
  USD: 'USD',
  GBP: 'GBP',
};

export const currencyLabel = (code) => CURRENCY_LABEL[code] || code;

export const PROVIDER_NAME = 'Licensed payment provider (demo)';

export function methodById(id) {
  return METHODS.find((m) => m.id === id) || METHODS[0];
}

const round2 = (n) => Math.round(n * 100) / 100;

// Full fee breakdown shown before paying and repeated on the receipt.
export function quote({ amount, planFeePaid, method, currency }) {
  const planFee = planFeePaid ? 0 : PLAN_FEE;
  const providerFee = round2(amount * methodById(method).feeRate);
  const fxRate = FX_RATES[currency] ?? FX_RATES.CNY;
  const totalMyr = round2(amount + planFee + providerFee);
  return {
    amount,
    planFee,
    providerFee,
    fxRate,
    currency,
    totalMyr,
    totalForeign: round2(totalMyr * fxRate),
  };
}

// ---- Payment status timeline ----
export const PAYMENT_STEPS = ['initiated', 'processing', 'received', 'confirmed'];

export function stepLabel(status, type) {
  const allowance = type === 'allowance';
  return {
    initiated: 'Payment initiated',
    processing: 'Processing by licensed provider',
    received: allowance ? 'Released to student account' : 'Received by university',
    confirmed: allowance ? 'Confirmed by student' : 'Confirmed & matched to invoice',
  }[status];
}

export function stepHint(status, type) {
  const allowance = type === 'allowance';
  return {
    initiated: 'The sponsor approved the payment in EduPilot.',
    processing: 'The licensed provider is moving the money. EduPilot never holds funds.',
    received: allowance
      ? 'The allowance has reached the student’s own account.'
      : 'The university finance office has received the funds.',
    confirmed: allowance
      ? 'The student confirmed the release. How it is spent stays private.'
      : 'Matched to the invoice and student ID – nothing more to do.',
  }[status];
}

// ---- Obligation status shown as a coloured chip ----
// completed | processing | scheduled | planned | overdue
export function obligationStatus(obligation, today = todayISO()) {
  if (obligation.status === 'completed') return 'completed';
  if (obligation.status === 'processing') return 'processing';
  if (obligation.due_date < today) return 'overdue';
  if (obligation.status === 'scheduled') return 'scheduled';
  return 'planned';
}

export function canPay(obligation) {
  return obligation.status === 'planned' || obligation.status === 'scheduled';
}

export const TYPE_LABEL = {
  tuition: 'Tuition fee',
  accommodation: 'Accommodation fee',
  allowance: 'Living allowance',
};

export function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
