export const BOARD = {
  GBPUSD: 1.2748,
  USDNGN: 1548.25,
};

export const RATES_TO_USD = {
  USD: 1,
  GBP: BOARD.GBPUSD,
  NGN: 1 / BOARD.USDNGN,
};

export const SYMBOL = {
  USD: '$',
  GBP: '£',
  NGN: '₦',
};

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw ?? '').replace(/,/g, '').trim();
  if (!cleaned) return NaN;
  return Number(cleaned);
}

export function formatAmountInput(raw) {
  const cleaned = String(raw ?? '').replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!cleaned) return '';
  const dot = cleaned.indexOf('.');
  const whole = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const decimals = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const digits = whole.replace(/^0+(?=\d)/, '');
  const grouped = (digits || (dot === -1 ? '' : '0')).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (dot === -1) return grouped;
  return `${grouped || '0'}.${decimals}`;
}

export function formatAmountFixed(raw) {
  const value = parseAmount(raw);
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function moneyLt(left, right) {
  return Math.round(left * 100) < Math.round(right * 100);
}

export function convert(amount, from, to) {
  if (from === to) return amount;
  const usd = amount * RATES_TO_USD[from];
  return usd / RATES_TO_USD[to];
}

export function formatRate(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatMoney(amount, currency, { signed = false } = {}) {
  let value = amount;
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) value = 0;
  const negative = value < 0;
  const body = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const core = `${SYMBOL[currency] || ''}${body}`;
  if (negative) return `−${core}`;
  if (signed && value > 0) return `+${core}`;
  return core;
}

export function netWorthUsd(accounts) {
  return round2(accounts.reduce((sum, account) => sum + convert(account.balance, account.currency, 'USD'), 0));
}

export function monthKey(offset = 0, base = new Date()) {
  const date = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function cashflowSeries(transactions, base = new Date()) {
  const buckets = [];
  for (let offset = -5; offset <= 0; offset += 1) {
    const date = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-GB', { month: 'short' }),
    });
  }
  return buckets.map((bucket) => {
    let inflow = 0;
    let outflow = 0;
    for (const tx of transactions) {
      if (!tx.bookDate?.startsWith(bucket.key)) continue;
      const usd = convert(tx.amount, tx.currency, 'USD');
      if (usd >= 0) inflow += usd;
      else outflow += Math.abs(usd);
    }
    return { ...bucket, inflow, outflow };
  });
}
