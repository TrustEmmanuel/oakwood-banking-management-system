export const STORAGE_KEY = 'oakwood.finance.specimen.v2';

export const CABLE_FEE = {
  USD: 35,
  GBP: 25,
};

export function nipCharge(amount) {
  const value = Number(amount);
  if (value <= 5000) return 10;
  if (value <= 50000) return 25;
  return 50;
}

export const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
];

export const PURPOSE_CODES = [
  { code: 'SUPP', label: 'Supplier settlement' },
  { code: 'PAYR', label: 'Payroll disbursement' },
  { code: 'INTC', label: 'Intra-group transfer' },
  { code: 'SERV', label: 'Professional services' },
  { code: 'TAXS', label: 'Tax payment' },
  { code: 'CASH', label: 'Cash management sweep' },
  { code: 'LOAN', label: 'Loan servicing' },
  { code: 'DIVD', label: 'Distribution' },
];

export const CHARGE_BEARERS = [
  { id: 'SHA', label: 'SHA', hint: 'You pay the Oakwood cable charge. The beneficiary bank may deduct its own fee.' },
  { id: 'OUR', label: 'OUR', hint: 'You pay the cable charge plus an estimated correspondent uplift.' },
  { id: 'BEN', label: 'BEN', hint: 'Charges are deducted from the amount the beneficiary receives.' },
];

export const TX_TYPES = [
  { id: 'WIRE_IN', label: 'Incoming wire' },
  { id: 'WIRE_OUT', label: 'Outward payment' },
  { id: 'SWEEP', label: 'Book transfer' },
  { id: 'PAYROLL', label: 'Payroll' },
  { id: 'BILL', label: 'Bill payment' },
  { id: 'FEE', label: 'Bank charge' },
  { id: 'CARD', label: 'Debit card' },
  { id: 'DRAW', label: 'Credit draw' },
  { id: 'REPAY', label: 'Loan repayment' },
];

export const BENEFICIARY_TYPES = ['Vendor', 'Payroll', 'Intra-group'];

export const CORRESPONDENTS = {
  US: { bank: 'Oakwood Finance, N.A.', city: 'New York', swift: 'OAKWUS33', cutoff: '17:00 ET' },
  GB: { bank: 'Oakwood Finance UK', city: 'London', swift: 'OAKWGB2L', cutoff: '16:30 GMT' },
  NG: { bank: 'Oakwood Finance Nigeria', city: 'Lagos', swift: 'OAKWNGLA', cutoff: '15:00 WAT' },
};

export const PROVIDERS = [
  { id: 'coned', name: 'Con Edison', region: 'US', currency: 'USD', category: 'Utilities', hint: 'Commercial electric account' },
  { id: 'aws', name: 'AWS Cloud Services', region: 'US', currency: 'USD', category: 'Technology', hint: 'Payer account or invoice' },
  { id: 'verizon', name: 'Verizon Business', region: 'US', currency: 'USD', category: 'Communications', hint: 'Corporate billing number' },
  { id: 'british-gas', name: 'British Gas', region: 'GB', currency: 'GBP', category: 'Utilities', hint: 'Business gas account' },
  { id: 'vodafone', name: 'Vodafone Business', region: 'GB', currency: 'GBP', category: 'Communications', hint: 'Account or circuit reference' },
  { id: 'thames', name: 'Thames Water Business', region: 'GB', currency: 'GBP', category: 'Utilities', hint: 'Supply point identifier' },
  { id: 'ekedc', name: 'EKEDC Electricity', region: 'NG', currency: 'NGN', category: 'Utilities', hint: 'Prepaid or postpaid meter' },
  { id: 'mtn', name: 'MTN Enterprise Internet', region: 'NG', currency: 'NGN', category: 'Communications', hint: 'Enterprise circuit ID' },
  { id: 'ikeja', name: 'Ikeja Electric', region: 'NG', currency: 'NGN', category: 'Utilities', hint: 'Business meter number' },
];

export function typeLabel(id) {
  return TX_TYPES.find((type) => type.id === id)?.label || id;
}

export function purposeLabel(code) {
  const match = PURPOSE_CODES.find((item) => item.code === code);
  return match ? `${match.code} · ${match.label}` : code;
}
