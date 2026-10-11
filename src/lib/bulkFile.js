import * as XLSX from 'xlsx';
import { formatAmountFixed, parseAmount } from './money.js';
import { normalizeBeneficiary, validateBeneficiary } from './validate.js';

const HEADERS = [
  'Name',
  'Beneficiary bank',
  'NUBAN',
  'Debit account',
  'Amount',
  'Narrative',
];

const SAMPLE = [
  'Sample Beneficiary',
  'Fidelity Bank',
  '0123456789',
  'NGN',
  1000,
  'Invoice 1001',
];

const HEADER_FIELDS = {
  name: 'name',
  'beneficiary name': 'name',
  beneficiary: 'name',
  'legal name': 'name',
  country: 'country',
  currency: 'currency',
  'beneficiary bank': 'bankName',
  bank: 'bankName',
  'bank name': 'bankName',
  'routing number': 'bankCode',
  'routing number or sort code': 'bankCode',
  'sort code': 'bankCode',
  'aba routing number': 'bankCode',
  'bank code': 'bankCode',
  'account number': 'accountNumber',
  account: 'accountNumber',
  nuban: 'accountNumber',
  swift: 'swift',
  'swift bic': 'swift',
  bic: 'swift',
  'debit account': 'debit',
  'funding account': 'debit',
  amount: 'amount',
  'beneficiary amount': 'amount',
  narrative: 'narrative',
  narration: 'narrative',
};

function headerKey(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function countryCode(value) {
  const text = headerKey(value);
  if (['us', 'usa', 'united states', 'united states of america'].includes(text)) return 'US';
  if (['gb', 'uk', 'united kingdom', 'great britain', 'britain'].includes(text)) return 'GB';
  if (['ng', 'nigeria'].includes(text)) return 'NG';
  return '';
}

function currencyCode(value, country) {
  const text = String(value ?? '').trim().toUpperCase();
  if (['USD', 'GBP', 'NGN'].includes(text)) return text;
  if (!text) return { US: 'USD', GB: 'GBP', NG: 'NGN' }[country] || '';
  return '';
}

function textCell(value) {
  if (value == null) return '';
  return String(value).trim();
}

function debitAccountId(value, accounts) {
  const text = headerKey(value);
  const naira = accounts.find((account) => account.currency === 'NGN');
  if (!text) return { error: 'Enter NGN as the debit account. Bulk upload is for Nigerian payments only.' };
  const match = accounts.find((account) => (
    account.id === text
    || headerKey(account.name) === text
    || (account.currency === 'NGN' && (text === 'ngn' || text.includes('naira')))
  ));
  if (match?.currency === 'NGN') return { id: match.id };
  if (naira && (text === 'ngn' || text.includes('naira') || headerKey(naira.name) === text)) return { id: naira.id };
  return { error: 'Bulk upload is for Nigerian payments only. Debit the NGN account.' };
}

export function bulkTemplateBytes() {
  const payments = XLSX.utils.aoa_to_sheet([HEADERS, SAMPLE]);
  payments['!cols'] = [28, 28, 16, 16, 14, 28].map((wch) => ({ wch }));
  payments.C2 = { t: 's', v: '0123456789' };

  const guide = XLSX.utils.aoa_to_sheet([
    ['Oakwood bulk payment template'],
    [''],
    ['This upload is for Nigerian payments only. Each line pays a NUBAN in NGN from the NGN account.'],
    ['Use the Payments sheet. Enter one beneficiary on each row, then upload the file in Bulk disbursement.'],
    ['The sample row is ignored. Replace Sample Beneficiary with the people you are paying.'],
    ['A batch can contain up to 20 payments.'],
    [''],
    ['Column', 'What to enter'],
    ['Name', 'Beneficiary name.'],
    ['Beneficiary bank', 'Name of the Nigerian bank.'],
    ['NUBAN', '10-digit Nigerian account number.'],
    ['Debit account', 'NGN. This batch cannot debit USD or GBP.'],
    ['Amount', 'Amount the beneficiary receives, in NGN.'],
    ['Narrative', 'Payment narrative, at least 3 characters.'],
  ]);
  guide['!cols'] = [{ wch: 22 }, { wch: 110 }];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, payments, 'Payments');
  XLSX.utils.book_append_sheet(book, guide, 'Guide');
  return XLSX.write(book, { bookType: 'xlsx', type: 'array' });
}

export function bulkTemplateBlob() {
  return new Blob([bulkTemplateBytes()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function parseBulkWorkbook(data, accounts) {
  const book = XLSX.read(data, { type: 'array' });
  const sheet = book.Sheets.Payments || book.Sheets[book.SheetNames[0]];
  if (!sheet) return { ok: false, error: 'The workbook has no payment sheet.' };
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const headerIndex = matrix.findIndex((row) => row.some((cell) => headerKey(cell) === 'name') && row.some((cell) => headerKey(cell) === 'amount'));
  if (headerIndex === -1) {
    return { ok: false, error: 'Use the Oakwood bulk template. The payment headers were not found.' };
  }
  const fields = matrix[headerIndex].map((cell) => HEADER_FIELDS[headerKey(cell)] || '');
  const required = ['name', 'bankName', 'accountNumber', 'debit', 'amount', 'narrative'];
  const missing = required.filter((field) => !fields.includes(field));
  if (missing.length) {
    return { ok: false, error: 'Use the Oakwood bulk template. A required column is missing.' };
  }

  const rows = [];
  const errors = [];
  let skippedSample = false;
  matrix.slice(headerIndex + 1).forEach((row, offset) => {
    const record = {};
    fields.forEach((field, index) => {
      if (field) record[field] = row[index];
    });
    const blank = !textCell(record.name) && !textCell(record.amount) && !textCell(record.accountNumber) && !textCell(record.bankName);
    if (blank) return;
    const excelRow = headerIndex + offset + 2;
    if (headerKey(record.name) === 'sample beneficiary') {
      skippedSample = true;
      return;
    }
    const suppliedCountry = textCell(record.country);
    const country = suppliedCountry ? countryCode(suppliedCountry) : 'NG';
    if (country !== 'NG') {
      errors.push(`Row ${excelRow}: Bulk upload is for Nigerian payments only.`);
      return;
    }
    const suppliedCurrency = textCell(record.currency);
    const currency = suppliedCurrency ? currencyCode(suppliedCurrency, 'NG') : 'NGN';
    if (currency !== 'NGN') {
      errors.push(`Row ${excelRow}: Bulk upload is for NGN payments only.`);
      return;
    }
    const debit = debitAccountId(record.debit, accounts);
    if (debit.error || !debit.id) {
      errors.push(`Row ${excelRow}: ${debit.error || 'Debit the NGN account.'}`);
      return;
    }
    const manualInput = {
      name: textCell(record.name),
      country: 'NG',
      currency: 'NGN',
      type: 'Vendor',
      bankName: textCell(record.bankName),
      bankCode: '',
      accountNumber: textCell(record.accountNumber),
      swift: '',
    };
    const validation = validateBeneficiary(manualInput);
    if (validation) {
      errors.push(`Row ${excelRow}: ${validation}`);
      return;
    }
    const amount = parseAmount(record.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Row ${excelRow}: Enter an amount greater than zero.`);
      return;
    }
    const narrative = textCell(record.narrative);
    if (narrative.length < 3) {
      errors.push(`Row ${excelRow}: Enter a narrative of at least 3 characters.`);
      return;
    }
    if (narrative.length > 140) {
      errors.push(`Row ${excelRow}: Keep the narrative to 140 characters.`);
      return;
    }
    rows.push({
      beneficiaryId: '',
      accountId: debit.id,
      amount: formatAmountFixed(amount),
      narrative,
      manual: normalizeBeneficiary(manualInput),
    });
  });

  if (errors.length) return { ok: false, error: errors.join(' ') };
  if (!rows.length) {
    return {
      ok: false,
      error: skippedSample
        ? 'The file only contains the sample row. Replace Sample Beneficiary with the payments you want to send.'
        : 'The file has no payment lines.',
    };
  }
  if (rows.length > 20) return { ok: false, error: 'A batch is limited to 20 lines.' };
  const sampleNote = skippedSample ? ' The sample row was skipped.' : '';
  return {
    ok: true,
    rows,
    message: `Loaded ${rows.length} payment${rows.length === 1 ? '' : 's'} from the file.${sampleNote}`,
  };
}
