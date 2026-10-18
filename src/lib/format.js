import { currencyLabel } from './rules';
export function rm(n, { decimals } = {}) {
  const value = Number(n) || 0;
  const d = decimals ?? (Number.isInteger(value) ? 0 : 2);
  return 'RM ' + value.toLocaleString('en-MY', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function foreign(n, currency) {
  const value = Number(n) || 0;
  const d = currency === 'IDR' ? 0 : 2;
  return currencyLabel(currency) + ' ' + value.toLocaleString('en-MY', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// "2026-10-17" -> "17 Oct 2026"
export function date(iso) {
  if (!iso) return '–';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function monthYear(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function firstName(fullName = '') {
  return fullName.split(' ')[0] || fullName;
}

export function initials(fullName = '') {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
