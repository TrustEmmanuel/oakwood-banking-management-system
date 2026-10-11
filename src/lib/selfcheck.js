import * as XLSX from 'xlsx';
import { buildSeed } from '../data/seed.js';
import { bulkTemplateBytes, parseBulkWorkbook } from './bulkFile.js';
import { todayISO } from './dates.js';
import {
  applyBill,
  applyBulk,
  applyForCredit,
  applyTransfer,
  assessBulk,
  authenticate,
  changePassword,
  drawFacility,
  quotePayment,
  repayFacility,
} from './ledger.js';
import { round2 } from './money.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    throw new Error(message);
  }
}

const state = buildSeed({ profileId: 'cfo', at: new Date().toISOString() });

for (const account of state.accounts) {
  console.log(`${account.id} balance=${account.balance} available=${account.available}`);
  assert(account.balance > account.hold, `${account.id} balance covers hold`);
  assert(Math.abs(account.available - round2(account.balance - account.hold)) < 0.001, `${account.id} available ties`);
  const net = state.transactions.filter((tx) => tx.accountId === account.id).reduce((sum, tx) => sum + tx.amount, 0);
  assert(account.balance - net > 0, `${account.id} implied opening is positive`);
}

const ids = new Set(state.transactions.map((tx) => tx.id));
assert(ids.size === state.transactions.length, 'transaction ids are unique');
for (const tx of state.transactions) {
  const account = state.accounts.find((item) => item.id === tx.accountId);
  assert(tx.currency === account.currency, `${tx.id} currency matches account`);
}

const sha = quotePayment({
  fromCurrency: 'USD',
  toCurrency: 'GBP',
  paymentAmount: '10000',
  crossBorder: true,
  chargeBearer: 'SHA',
});
assert(sha.ok && sha.principal === 12748 && sha.fee === 35 && sha.totalDebit === 12783, 'SHA quote');

const our = quotePayment({
  fromCurrency: 'USD',
  toCurrency: 'GBP',
  paymentAmount: 10000,
  crossBorder: true,
  chargeBearer: 'OUR',
});
assert(our.fee === 61.25 && our.totalDebit === 12809.25, 'OUR quote');

const ben = quotePayment({
  fromCurrency: 'USD',
  toCurrency: 'GBP',
  paymentAmount: 10000,
  crossBorder: true,
  chargeBearer: 'BEN',
});
assert(ben.totalDebit === 12748 && ben.beneficiaryCredit === 9972.54, `BEN quote credit ${ben.beneficiaryCredit}`);

const nip = quotePayment({
  fromCurrency: 'USD',
  toCurrency: 'NGN',
  paymentAmount: 5000,
  crossBorder: true,
  chargeBearer: 'SHA',
});
assert(nip.ok && nip.fee === 10 && nip.feeCurrency === 'NGN' && nip.principal === 3.23 && nip.totalDebit === 3.24, `NIP quote debit ${nip.totalDebit} fee ${nip.fee}`);
assert(nip.beneficiaryCredit === 5000, 'NIP beneficiary receives the full naira amount');

const gbpPayee = {
  name: 'Helios Components Ltd',
  country: 'GB',
  currency: 'GBP',
  type: 'Vendor',
  bankName: 'Northbridge Bank',
  bankCode: '20-00-14',
  accountNumber: '83726194',
  swift: 'NBGBGB2L',
  save: false,
};
const payrollState = {
  ...state,
  beneficiaries: [
    ...state.beneficiaries,
    { id: 'elena', name: 'Elena Vasquez', country: 'US', currency: 'USD', type: 'Payroll', bankName: 'Harbor National Bank', bankCode: '021000089', accountNumber: '7782011944', swift: 'HRBNUS33' },
    { id: 'priya', name: 'Priya Shah', country: 'GB', currency: 'GBP', type: 'Payroll', bankName: 'Northbridge Bank', bankCode: '30-96-17', accountNumber: '44912038', swift: 'NBGBGB2L' },
    { id: 'chioma', name: 'Chioma Adeyemi', country: 'NG', currency: 'NGN', type: 'Payroll', bankName: 'Harbor Merchant Bank', bankCode: '', accountNumber: '0126671904', swift: '' },
  ],
};

const usdBefore = state.accounts.find((account) => account.id === 'usd').balance;
const gbpBefore = state.accounts.find((account) => account.id === 'gbp').balance;
const paid = applyTransfer(state, {
  pin: '482916',
  accountId: 'usd',
  destinationType: 'manual',
  manual: gbpPayee,
  amount: '10000',
  purpose: 'SUPP',
  narrative: 'Invoice HC-3001',
  chargeBearer: 'SHA',
  valueDate: todayISO(),
});
assert(paid.ok, paid.error || 'transfer ok');
assert(paid.state.accounts.find((account) => account.id === 'usd').balance === round2(usdBefore - 12783), 'USD debited');
assert(paid.state.accounts.find((account) => account.id === 'gbp').balance === gbpBefore, 'GBP untouched');
assert(paid.receipt.reference.startsWith('OFWT'), 'receipt reference');

const wrongPin = applyTransfer(state, {
  pin: '000000',
  accountId: 'usd',
  destinationType: 'manual',
  manual: gbpPayee,
  amount: '10000',
  purpose: 'SUPP',
  narrative: 'Invoice HC-3001',
  chargeBearer: 'SHA',
});
assert(!wrongPin.ok && wrongPin.state.accounts.find((account) => account.id === 'usd').balance === usdBefore, 'wrong PIN does not post');

const tooLarge = applyTransfer(state, {
  pin: '482916',
  accountId: 'usd',
  destinationType: 'manual',
  manual: gbpPayee,
  amount: '9000000',
  purpose: 'SUPP',
  narrative: 'Too large',
  chargeBearer: 'SHA',
});
assert(!tooLarge.ok && tooLarge.state.accounts.find((account) => account.id === 'usd').balance === usdBefore, 'insufficient funds');

const ngnBefore = state.accounts.find((account) => account.id === 'ngn').balance;
const book = applyTransfer(paid.state, {
  pin: '482916',
  accountId: 'usd',
  destinationType: 'own',
  targetAccountId: 'ngn',
  amount: '1548250',
  purpose: 'CASH',
  narrative: 'Lagos sweep',
  chargeBearer: 'SHA',
});
assert(book.ok, book.error || 'book transfer');
const usdAfterBook = paid.state.accounts.find((account) => account.id === 'usd').balance;
assert(book.state.accounts.find((account) => account.id === 'usd').balance === round2(usdAfterBook - 1000), 'USD sweep debit');
assert(book.state.accounts.find((account) => account.id === 'ngn').balance === round2(ngnBefore + 1548250), 'NGN sweep credit');

const bulkFail = applyBulk(payrollState, {
  pin: '482916',
  purpose: 'PAYR',
  rows: [
    { beneficiaryId: 'elena', accountId: 'usd', amount: '100', narrative: 'Salary' },
    { beneficiaryId: 'elena', accountId: 'usd', amount: '99999999', narrative: 'Salary overflow' },
  ],
});
assert(!bulkFail.ok && bulkFail.state.accounts.find((account) => account.id === 'usd').balance === usdBefore, 'bulk is atomic');

const bulk = applyBulk(payrollState, {
  pin: '482916',
  purpose: 'PAYR',
  rows: [
    { beneficiaryId: 'elena', accountId: 'usd', amount: '8420', narrative: 'October salary' },
    { beneficiaryId: 'priya', accountId: 'gbp', amount: '6100', narrative: 'October salary' },
    { beneficiaryId: 'chioma', accountId: 'ngn', amount: '1850000', narrative: 'October salary' },
  ],
});
assert(bulk.ok && bulk.receipt.lines.length === 3, bulk.error || 'bulk posts');

const bill = applyBill(bulk.state, {
  pin: '482916',
  providerId: 'coned',
  accountId: 'usd',
  amount: '250.40',
  customerReference: 'CE-99281',
});
assert(bill.ok, bill.error || 'bill posts');

const draw = drawFacility(bill.state, { pin: '482916', facilityId: 'revolver', amount: '100000' });
assert(draw.ok, draw.error || 'draw');
assert(draw.state.facilities.find((item) => item.id === 'revolver').drawn === 2250000, 'drawn increases');

const repay = repayFacility(draw.state, { pin: '482916', facilityId: 'term-gbp' });
assert(repay.ok, repay.error || 'instalment');
assert(repay.state.facilities.find((item) => item.id === 'term-gbp').remainingMonths === 29, 'tenor reduces');

const request = applyForCredit(repay.state, {
  type: 'Term loan',
  currency: 'USD',
  amount: '750000',
  tenorMonths: 36,
  purpose: 'Equipment for the Houston line',
});
assert(request.ok && request.state.applications.length === 2, 'application stored');

const password = changePassword(request.state, {
  current: 'OakwoodCFO!26',
  next: 'Treasury#2026',
  confirm: 'Treasury#2026',
});
assert(password.ok, password.error || 'password');
const login = authenticate(password.state, {
  companyId: 'oak-ny-4401',
  userId: 'dgonzalez',
  password: 'Treasury#2026',
});
assert(login.ok, login.error || 'relogin');

const bad = authenticate(password.state, {
  companyId: 'OAK-NY-4401',
  userId: 'DGONZALEZ',
  password: 'nope',
});
assert(!bad.ok && bad.state.audit[0].action === 'Sign-in refused', 'failed login audited');

const templateOnly = parseBulkWorkbook(bulkTemplateBytes(), state.accounts);
assert(!templateOnly.ok && /sample/i.test(templateOnly.error), templateOnly.error || 'template sample is not a payment');

const workbook = XLSX.read(bulkTemplateBytes(), { type: 'array' });
XLSX.utils.sheet_add_aoa(workbook.Sheets.Payments, [[
  'Emmanuel Udeka',
  'Fidelity Bank',
  '5050192094',
  'NGN',
  5000,
  'October settlement',
]], { origin: 'A3' });
const uploaded = parseBulkWorkbook(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }), state.accounts);
assert(uploaded.ok && uploaded.rows.length === 1, uploaded.error || 'bulk file parses');
assert(uploaded.rows[0].manual.country === 'NG' && uploaded.rows[0].manual.currency === 'NGN', 'uploaded payment is Nigerian');
assert(uploaded.rows[0].manual.accountNumber === '5050192094', 'uploaded nuban');
assert(uploaded.rows[0].accountId === 'ngn', 'uploaded debit account');
const foreignBook = XLSX.read(bulkTemplateBytes(), { type: 'array' });
XLSX.utils.sheet_add_aoa(foreignBook.Sheets.Payments, [[
  'Foreign Payee',
  'First National Bank',
  '123456789',
  'USD',
  100,
  'Foreign payment',
]], { origin: 'A3' });
const foreign = parseBulkWorkbook(XLSX.write(foreignBook, { bookType: 'xlsx', type: 'array' }), state.accounts);
assert(!foreign.ok && /Nigerian/i.test(foreign.error), foreign.error || 'foreign bulk row rejected');
const uploadedQuote = assessBulk(state, { purpose: 'Supplier settlement', rows: uploaded.rows });
assert(uploadedQuote.ok, uploadedQuote.error || 'uploaded batch quotes');
assert(!assessBulk(state, { purpose: '', rows: uploaded.rows }).ok, 'batch purpose is required');

console.log('selfcheck ok');
