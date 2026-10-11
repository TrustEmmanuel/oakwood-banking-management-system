const SWIFT = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export function validateBeneficiary(input) {
  const name = input.name?.trim() || '';
  if (name.length < 2) return 'Enter the beneficiary legal name.';
  if (!['US', 'GB', 'NG'].includes(input.country)) return 'Select a destination country.';
  if (!['USD', 'GBP', 'NGN'].includes(input.currency)) return 'Select a currency.';
  if (!input.bankName || input.bankName.trim().length < 2) return 'Enter the beneficiary bank name.';
  const accountNumber = (input.accountNumber || '').replace(/\s/g, '');
  const bankCode = (input.bankCode || '').trim().toUpperCase();
  if (input.country === 'US') {
    if (!/^\d{9}$/.test(bankCode)) return 'Enter a 9-digit ABA routing number.';
    if (!/^\d{6,17}$/.test(accountNumber)) return 'Enter the USD account number (6–17 digits).';
  } else if (input.country === 'GB') {
    if (!/^\d{6}$/.test(bankCode.replace(/-/g, ''))) return 'Enter a 6-digit sort code.';
    if (!/^\d{8}$/.test(accountNumber)) return 'Enter the 8-digit GBP account number.';
  } else if (input.country === 'NG') {
    if (!/^\d{10}$/.test(accountNumber)) return 'Enter a 10-digit NUBAN.';
  }
  if (input.country !== 'NG' && input.swift && !SWIFT.test(input.swift.trim().toUpperCase())) {
    return 'SWIFT / BIC must be 8 or 11 characters.';
  }
  return null;
}

export function normalizeBeneficiary(input) {
  const nigeria = input.country === 'NG';
  let bankCode = nigeria ? '' : (input.bankCode || '').trim().toUpperCase();
  if (input.country === 'GB') {
    const sort = bankCode.replace(/-/g, '');
    bankCode = `${sort.slice(0, 2)}-${sort.slice(2, 4)}-${sort.slice(4, 6)}`;
  }
  return {
    id: input.id,
    name: input.name.trim(),
    country: input.country,
    currency: input.currency,
    type: input.type || 'Vendor',
    bankName: input.bankName.trim(),
    bankCode,
    accountNumber: input.accountNumber.replace(/\s/g, ''),
    swift: nigeria ? '' : (input.swift || '').trim().toUpperCase(),
  };
}

export function accountLine(beneficiary) {
  if (!beneficiary) return '';
  if (beneficiary.country === 'US') return `ABA ${beneficiary.bankCode} · ${beneficiary.accountNumber}`;
  if (beneficiary.country === 'GB') return `${beneficiary.bankCode} · ${beneficiary.accountNumber}`;
  return `NUBAN ${beneficiary.accountNumber}`;
}

export function countryName(code) {
  return { US: 'United States', GB: 'United Kingdom', NG: 'Nigeria' }[code] || code;
}
