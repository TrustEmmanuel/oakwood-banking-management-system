import { CORRESPONDENTS, STORAGE_KEY } from './catalog.js';
import { atMonthOffset, isoDate } from '../lib/dates.js';
import { convert, round2 } from '../lib/money.js';

const OPENING = {
  usd: 8000000,
  gbp: 2200000,
  ngn: 1800000000,
};

let sequence = 1800;

function entry(spec) {
  sequence += 1;
  const when = atMonthOffset(spec.month, spec.day, spec.hour ?? 10, spec.minute ?? 20);
  return {
    id: `TX${sequence}`,
    reference: spec.reference || `OFWT${sequence}`,
    status: spec.status || 'Settled',
    batchId: spec.batchId || null,
    date: when.date,
    bookDate: when.bookDate,
    accountId: spec.accountId,
    counterparty: spec.counterparty,
    narrative: spec.narrative,
    type: spec.type,
    corridor: spec.corridor,
    currency: spec.currency,
    amount: round2(spec.amount),
    meta: spec.meta || null,
  };
}

function withFee(spec, fee) {
  const primary = entry(spec);
  if (!fee) return [primary];
  const charge = entry({
    ...spec,
    minute: (spec.minute ?? 20) - 1,
    hour: spec.hour ?? 10,
    counterparty: 'Oakwood Finance',
    narrative: `Cable charge · ${primary.reference}`,
    type: 'FEE',
    amount: -Math.abs(fee),
    reference: primary.reference,
    meta: null,
    status: 'Settled',
  });
  return [primary, charge];
}

function buildTransactions() {
  const sweepGbp = round2(convert(400000, 'USD', 'GBP'));
  const heliosGbp = round2(convert(128400, 'USD', 'GBP'));
  const lagosNgn = round2(convert(250000, 'USD', 'NGN'));
  const rows = [
    entry({ month: -5, day: 4, hour: 9, accountId: 'usd', currency: 'USD', amount: 486250, type: 'WIRE_IN', corridor: 'Domestic US', counterparty: 'Meridian Aerospace Inc', narrative: 'Progress billing MA-661' }),
    entry({ month: -5, day: 8, hour: 11, accountId: 'gbp', currency: 'GBP', amount: -126480, type: 'WIRE_OUT', corridor: 'Domestic GB', counterparty: 'Helios Components Ltd', narrative: 'Invoice HC-2044 machined housings' }),
    entry({ month: -5, day: 14, hour: 12, accountId: 'ngn', currency: 'NGN', amount: -64000000, type: 'WIRE_OUT', corridor: 'Domestic NG', counterparty: 'Sahel Agro Exports Ltd', narrative: 'Produce purchase SA-1182' }),
    entry({ month: -5, day: 18, hour: 15, accountId: 'usd', currency: 'USD', amount: -38440, type: 'BILL', corridor: 'Domestic US', counterparty: 'AWS Cloud Services', narrative: 'Invoice AWS-MAY-4401' }),
    entry({ month: -5, day: 22, hour: 10, accountId: 'gbp', currency: 'GBP', amount: -28600, type: 'WIRE_OUT', corridor: 'Domestic GB', counterparty: 'Thames Consulting LLP', narrative: 'Advisory retainer — Q2' }),
    entry({ month: -5, day: 26, hour: 13, accountId: 'ngn', currency: 'NGN', amount: 125000000, type: 'WIRE_IN', corridor: 'Domestic NG', counterparty: 'Lekki Consumer Goods Plc', narrative: 'Collections LC-5521' }),

    entry({ month: -4, day: 2, hour: 8, accountId: 'usd', currency: 'USD', amount: -542800, type: 'PAYROLL', corridor: 'Domestic US', counterparty: 'Apex Workforce Ltd', narrative: 'Monthly payroll disbursement' }),
    entry({ month: -4, day: 3, hour: 9, accountId: 'usd', currency: 'USD', amount: 500000, type: 'DRAW', corridor: 'Domestic US', counterparty: 'Oakwood Finance', narrative: 'Revolving credit draw RF-219' }),
    entry({ month: -4, day: 9, hour: 11, accountId: 'gbp', currency: 'GBP', amount: -86420, type: 'WIRE_OUT', corridor: 'Domestic GB', counterparty: 'Northbridge Metals Ltd', narrative: 'Invoice NM-883 plate stock' }),
    ...withFee({ month: -4, day: 12, hour: 14, accountId: 'usd', currency: 'USD', amount: -176340, type: 'WIRE_OUT', corridor: 'US → GB', counterparty: 'Helios Components Ltd', narrative: 'Invoice HC-2102 cross-border settlement' }, 35),
    entry({ month: -4, day: 16, hour: 10, accountId: 'ngn', currency: 'NGN', amount: 98000000, type: 'WIRE_IN', corridor: 'Domestic NG', counterparty: 'Island Logistics Plc', narrative: 'Freight collections IL-220' }),
    entry({ month: -4, day: 19, hour: 16, accountId: 'gbp', currency: 'GBP', amount: -11240, type: 'BILL', corridor: 'Domestic GB', counterparty: 'British Gas', narrative: 'Business gas · account 44821' }),
    entry({ month: -4, day: 25, hour: 11, accountId: 'usd', currency: 'USD', amount: -96000, type: 'WIRE_OUT', corridor: 'Domestic US', counterparty: 'City & State Tax Authority', narrative: 'Estimated corporate tax instalment' }),

    entry({ month: -3, day: 1, hour: 8, accountId: 'ngn', currency: 'NGN', amount: -148200000, type: 'PAYROLL', corridor: 'Domestic NG', counterparty: 'Oakwood Nigeria Payroll', narrative: 'Monthly payroll disbursement' }),
    entry({ month: -3, day: 7, hour: 9, accountId: 'usd', currency: 'USD', amount: -16880, type: 'BILL', corridor: 'Domestic US', counterparty: 'Con Edison', narrative: 'Commercial power · acct 99281' }),
    entry({ month: -3, day: 10, hour: 12, accountId: 'gbp', currency: 'GBP', amount: 240000, type: 'WIRE_IN', corridor: 'Domestic GB', counterparty: 'Oakwood Manufacturing Ltd', narrative: 'Intra-group distribution' }),
    ...withFee({ month: -3, day: 15, hour: 15, accountId: 'usd', currency: 'USD', amount: -42800, type: 'WIRE_OUT', corridor: 'US → GB', counterparty: 'Sterling Counsel LLP', narrative: 'Matter OC-19 professional fees' }, 35),
    entry({ month: -3, day: 21, hour: 11, accountId: 'ngn', currency: 'NGN', amount: -24650000, type: 'BILL', corridor: 'Domestic NG', counterparty: 'EKEDC Electricity', narrative: 'Postpaid energy · meter 14-8821' }),
    entry({ month: -3, day: 28, hour: 10, accountId: 'usd', currency: 'USD', amount: -200000, type: 'REPAY', corridor: 'Domestic US', counterparty: 'Oakwood Finance', narrative: 'Revolver principal repayment' }),

    entry({ month: -2, day: 4, hour: 9, accountId: 'usd', currency: 'USD', amount: 690000, type: 'WIRE_IN', corridor: 'Domestic US', counterparty: 'Meridian Aerospace Inc', narrative: 'Progress billing MA-774' }),
    entry({ month: -2, day: 6, hour: 10, minute: 30, accountId: 'usd', currency: 'USD', amount: -400000, type: 'SWEEP', corridor: 'US → GB', counterparty: 'GBP Treasury Account', narrative: 'Book transfer to London treasury' }),
    entry({ month: -2, day: 6, hour: 10, minute: 31, accountId: 'gbp', currency: 'GBP', amount: sweepGbp, type: 'SWEEP', corridor: 'US → GB', counterparty: 'USD Checking', narrative: 'Book transfer from New York checking' }),
    ...withFee({ month: -2, day: 11, hour: 13, accountId: 'gbp', currency: 'GBP', amount: -75000, type: 'WIRE_OUT', corridor: 'GB → NG', counterparty: 'Sahel Agro Exports Ltd', narrative: 'Advance against SA-1304' }, 25),
    entry({ month: -2, day: 13, hour: 15, accountId: 'ngn', currency: 'NGN', amount: -8750000, type: 'BILL', corridor: 'Domestic NG', counterparty: 'MTN Enterprise Internet', narrative: 'Circuit ENT-2219' }),
    entry({ month: -2, day: 19, hour: 11, accountId: 'gbp', currency: 'GBP', amount: -99250, type: 'WIRE_OUT', corridor: 'Domestic GB', counterparty: 'Helios Components Ltd', narrative: 'Invoice HC-2210' }),
    entry({ month: -2, day: 26, hour: 14, accountId: 'usd', currency: 'USD', amount: -186000, type: 'WIRE_OUT', corridor: 'Domestic US', counterparty: 'Harbor & Main Properties', narrative: 'Rent — 400 Park Avenue' }),

    entry({ month: -1, day: 2, hour: 8, accountId: 'usd', currency: 'USD', amount: -556420, type: 'PAYROLL', corridor: 'Domestic US', counterparty: 'Apex Workforce Ltd', narrative: 'Monthly payroll disbursement' }),
    entry({ month: -1, day: 6, hour: 10, accountId: 'ngn', currency: 'NGN', amount: -18200000, type: 'WIRE_OUT', corridor: 'Domestic NG', counterparty: 'Victoria Island Facilities', narrative: 'Service charge Q3' }),
    entry({ month: -1, day: 9, hour: 16, accountId: 'gbp', currency: 'GBP', amount: -6420, type: 'BILL', corridor: 'Domestic GB', counterparty: 'Vodafone Business', narrative: 'Corporate mobility · 884120' }),
    ...withFee({ month: -1, day: 14, hour: 13, accountId: 'usd', currency: 'USD', amount: -214600, type: 'WIRE_OUT', corridor: 'US → NG', counterparty: 'Lagos Free Zone Logistics Ltd', narrative: 'Freight settlement LFZ-908' }, 35),
    entry({ month: -1, day: 18, hour: 9, accountId: 'ngn', currency: 'NGN', amount: 152000000, type: 'WIRE_IN', corridor: 'Domestic NG', counterparty: 'Island Logistics Plc', narrative: 'Collections IL-261' }),
    entry({ month: -1, day: 18, hour: 15, accountId: 'ngn', currency: 'NGN', amount: 80000000, type: 'WIRE_IN', corridor: 'GB → NG', counterparty: 'Oakwood Finance UK', narrative: 'Intra-group funding' }),
    entry({ month: -1, day: 24, hour: 11, accountId: 'gbp', currency: 'GBP', amount: -28600, type: 'WIRE_OUT', corridor: 'Domestic GB', counterparty: 'Thames Consulting LLP', narrative: 'Monthly retainer' }),
    entry({ month: -1, day: 27, hour: 17, accountId: 'usd', currency: 'USD', amount: -41225, type: 'BILL', corridor: 'Domestic US', counterparty: 'AWS Cloud Services', narrative: 'Invoice AWS-SEP-4401' }),

    entry({ month: 0, day: 1, hour: 8, accountId: 'ngn', currency: 'NGN', amount: -151400000, type: 'PAYROLL', corridor: 'Domestic NG', counterparty: 'Oakwood Nigeria Payroll', narrative: 'Monthly payroll disbursement' }),
    entry({ month: 0, day: 2, hour: 9, accountId: 'usd', currency: 'USD', amount: -17340, type: 'BILL', corridor: 'Domestic US', counterparty: 'Con Edison', narrative: 'Commercial power · acct 99281' }),
    entry({ month: 0, day: 2, hour: 11, accountId: 'gbp', currency: 'GBP', amount: -10980, type: 'BILL', corridor: 'Domestic GB', counterparty: 'British Gas', narrative: 'Business gas · account 44821' }),
    entry({ month: 0, day: 3, hour: 10, accountId: 'usd', currency: 'USD', amount: 185000, type: 'WIRE_IN', corridor: 'Domestic US', counterparty: 'Meridian Aerospace Inc', narrative: 'Milestone receipt MA-801' }),
    entry({ month: 0, day: 4, hour: 12, accountId: 'ngn', currency: 'NGN', amount: -19840000, type: 'BILL', corridor: 'Domestic NG', counterparty: 'EKEDC Electricity', narrative: 'Postpaid energy · meter 14-8821' }),
    entry({ month: 0, day: 5, hour: 14, accountId: 'gbp', currency: 'GBP', amount: 62400, type: 'WIRE_IN', corridor: 'US → GB', counterparty: 'Meridian Aerospace Inc', narrative: 'Commercial rebate' }),
    ...withFee({
      month: 0,
      day: 6,
      hour: 11,
      accountId: 'usd',
      currency: 'USD',
      amount: -128400,
      type: 'WIRE_OUT',
      corridor: 'US → GB',
      counterparty: 'Helios Components Ltd',
      narrative: 'Invoice HC-2291',
      meta: {
        paymentAmount: heliosGbp,
        paymentCurrency: 'GBP',
        beneficiaryCredit: heliosGbp,
        fee: 35,
        feeCurrency: 'USD',
        rateText: 'Specimen board rate',
        chargeBearer: 'SHA',
        purpose: 'SUPP',
        valueDate: atMonthOffset(0, 6, 11, 20).bookDate,
        counterpartyDetail: 'Northbridge Bank · 20-00-14 · 83726194',
      },
    }, 35),
    entry({
      month: 0,
      day: 28,
      hour: 16,
      minute: 5,
      accountId: 'usd',
      currency: 'USD',
      amount: -250000,
      type: 'WIRE_OUT',
      corridor: 'US → NG',
      counterparty: 'Lagos Free Zone Logistics Ltd',
      narrative: 'Advance freight LFZ-944',
      status: 'Processing',
      meta: {
        paymentAmount: lagosNgn,
        paymentCurrency: 'NGN',
        beneficiaryCredit: lagosNgn,
        fee: 0,
        feeCurrency: 'USD',
        rateText: 'Specimen board rate',
        chargeBearer: 'SHA',
        purpose: 'SUPP',
        valueDate: atMonthOffset(0, 28, 16, 5).bookDate,
        counterpartyDetail: 'Harbor Merchant Bank · NUBAN 0142291806 · 058',
      },
    }),
    entry({ month: 0, day: 7, hour: 18, accountId: 'gbp', currency: 'GBP', amount: -18, type: 'FEE', corridor: 'Domestic GB', counterparty: 'Oakwood Finance', narrative: 'Account maintenance' }),
  ];

  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)));
}

function buildAccounts(transactions) {
  const templates = [
    {
      id: 'usd',
      name: 'USD Checking',
      product: 'Commercial checking',
      currency: 'USD',
      region: 'US',
      hold: 164220,
      bank: 'Oakwood Finance, N.A.',
      address: '400 Park Avenue, 28th Floor, New York, NY 10022',
      swift: 'OAKWUS33',
      office: 'Global Subsidiaries, New York',
      identifiers: [
        { label: 'Routing number', value: '026014992' },
        { label: 'Account number', value: '4492187731' },
        { label: 'SWIFT / BIC', value: 'OAKWUS33' },
      ],
    },
    {
      id: 'gbp',
      name: 'GBP Treasury Account',
      product: 'Sterling treasury',
      currency: 'GBP',
      region: 'GB',
      hold: 12000,
      bank: 'Oakwood Finance UK',
      address: '18 Fenchurch Lane, London EC3M 3BY',
      swift: 'OAKWGB2L',
      office: 'Europe Treasury, London',
      identifiers: [
        { label: 'Sort code', value: '40-12-08' },
        { label: 'Account number', value: '18374652' },
        { label: 'IBAN', value: 'GB29OAKW40120818374652' },
        { label: 'SWIFT / BIC', value: 'OAKWGB2L' },
      ],
    },
    {
      id: 'ngn',
      name: 'NGN Operating Account',
      product: 'Naira operating',
      currency: 'NGN',
      region: 'NG',
      hold: 18400000,
      bank: 'Oakwood Finance Nigeria',
      address: '8 Adeola Odeku Street, Victoria Island, Lagos',
      swift: 'OAKWNGLA',
      office: 'West Africa Operations, Lagos',
      identifiers: [
        { label: 'NUBAN', value: '0128847391' },
        { label: 'Bank code', value: '909' },
        { label: 'Bank verification', value: '221••••418' },
        { label: 'SWIFT / BIC', value: 'OAKWNGLA' },
      ],
    },
  ];

  return templates.map((account) => {
    const net = transactions
      .filter((tx) => tx.accountId === account.id)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const balance = round2(OPENING[account.id] + net);
    return {
      ...account,
      balance,
      available: round2(balance - account.hold),
      correspondent: CORRESPONDENTS[account.region],
    };
  });
}

function isEmmanuel(name) {
  const normalized = String(name || '').trim().toLowerCase().replace(/m+/g, 'm');
  return normalized === 'emanuel udeka';
}

function buildBeneficiaries() {
  return [
    {
      id: 'emmanuel-udeka',
      name: 'Emmanuel Udeka',
      country: 'NG',
      currency: 'NGN',
      type: 'Intra-group',
      bankName: 'Fidelity Bank',
      bankCode: '',
      accountNumber: '5050192094',
      swift: '',
    },
  ];
}

function keepEmmanuel(beneficiaries) {
  const kept = beneficiaries.filter((item) => isEmmanuel(item.name));
  return kept.length ? kept : buildBeneficiaries();
}

function buildAudit() {
  const items = [
    { month: 0, day: 1, hour: 8, minute: 5, actor: 'David Gonzalez', action: 'Signed in', detail: 'Chief Financial Officer · New York', result: 'Success' },
    { month: 0, day: 2, hour: 9, minute: 12, actor: 'Sarah Smith', action: 'Bill payment', detail: 'British Gas · GBP Treasury Account', result: 'Success' },
    { month: 0, day: 4, hour: 12, minute: 2, actor: 'David Gonzalez', action: 'Statement exported', detail: 'NGN Operating Account · month to date', result: 'Success' },
    { month: -1, day: 14, hour: 13, minute: 8, actor: 'David Gonzalez', action: 'Wire authorized', detail: 'Lagos Free Zone Logistics Ltd · US → NG', result: 'Success' },
    { month: -1, day: 20, hour: 16, minute: 40, actor: 'Sarah Smith', action: 'Beneficiary added', detail: 'Daniel Okoye · Nigeria', result: 'Success' },
  ];
  return items.map((item, index) => {
    const when = atMonthOffset(item.month, item.day, item.hour, item.minute);
    return {
      id: `AUD${900 + index}`,
      at: when.date,
      bookDate: when.bookDate,
      actor: item.actor,
      action: item.action,
      detail: item.detail,
      result: item.result,
    };
  });
}

function specimenProfiles() {
  return [
    {
      id: 'cfo',
      name: 'David Gonzalez',
      title: 'Chief Financial Officer',
      mandate: 'Global Treasurer',
      companyId: 'OAK-NY-4401',
      userId: 'DGONZALEZ',
      password: 'OakwoodCFO!26',
      pin: '482916',
      email: 'd.gonzalez@oakwood.example',
      phone: '+1 ••• ••• 0144',
      location: 'New York',
      mfa: { authenticator: true, sms: true, email: false },
      passwordChangedAt: null,
      lastLogin: null,
    },
    {
      id: 'controller',
      name: 'Sarah Smith',
      title: 'Assistant Controller',
      mandate: 'Payments initiation',
      companyId: 'OAK-NY-4401',
      userId: 'SSMITH',
      password: 'Control#8841',
      pin: '193847',
      email: 's.smith@oakwood.example',
      phone: '+44 ••• ••• 2281',
      location: 'London',
      mfa: { authenticator: true, sms: false, email: true },
      passwordChangedAt: null,
      lastLogin: null,
    },
  ];
}

const PRIOR_NAMES = {
  'Amara Okonkwo': 'David Gonzalez',
  'James Whitfield': 'Sarah Smith',
};

function refreshSpecimenIdentity(state) {
  const canonical = specimenProfiles();
  const identity = ['name', 'title', 'mandate', 'companyId', 'userId', 'email', 'phone', 'location'];
  const profiles = state.profiles.map((profile) => {
    const fresh = canonical.find((item) => item.id === profile.id);
    if (!fresh) return profile;
    const next = { ...profile };
    identity.forEach((field) => {
      next[field] = fresh[field];
    });
    return next;
  });
  const audit = state.audit.map((entry) => (
    PRIOR_NAMES[entry.actor] ? { ...entry, actor: PRIOR_NAMES[entry.actor] } : entry
  ));
  return { ...state, profiles, audit };
}

export function buildSeed(session = null) {
  sequence = 1800;
  const transactions = buildTransactions();
  const accounts = buildAccounts(transactions);
  return {
    version: 1,
    session,
    profiles: specimenProfiles(),
    accounts,
    transactions,
    beneficiaries: buildBeneficiaries(),
    facilities: [
      {
        id: 'revolver',
        name: 'Multicurrency revolving credit facility',
        shortName: 'RCF',
        kind: 'revolver',
        currency: 'USD',
        limit: 8000000,
        drawn: 2150000,
        rate: 0.0642,
        rateLabel: 'Term SOFR + 1.85%',
        allInLabel: '6.42% specimen all-in',
        maturity: isoDate(24, 30),
        nextPayment: isoDate(1, 2),
        remainingMonths: null,
        status: 'Active',
        covenants: 'Net leverage ≤ 3.00x · Interest cover ≥ 3.50x',
        covenantStatus: 'Compliant',
      },
      {
        id: 'term-gbp',
        name: 'Sterling term loan — London hub',
        shortName: 'Term loan',
        kind: 'term',
        currency: 'GBP',
        limit: 1200000,
        drawn: 840000,
        rate: 0.0515,
        rateLabel: '5.15% fixed',
        allInLabel: '5.15% fixed',
        maturity: isoDate(30, 1),
        nextPayment: isoDate(1, 2),
        remainingMonths: 30,
        status: 'Active',
        covenants: 'Springing lien on UK receivables',
        covenantStatus: 'Compliant',
      },
    ],
    applications: [
      {
        id: 'APP1044',
        reference: 'OFCR1044',
        submittedAt: atMonthOffset(-1, 12, 11, 45).date,
        type: 'Revolver increase',
        currency: 'USD',
        amount: 2000000,
        tenorMonths: 24,
        purpose: 'Working capital for the Lagos expansion',
        status: 'In review',
      },
    ],
    audit: buildAudit(),
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.profiles)) return null;
    if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.beneficiaries)) return null;
    if (!Array.isArray(parsed.facilities) || !Array.isArray(parsed.audit)) return null;
    const refreshed = refreshSpecimenIdentity(parsed);
    return { ...refreshed, beneficiaries: keepEmmanuel(refreshed.beneficiaries) };
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
