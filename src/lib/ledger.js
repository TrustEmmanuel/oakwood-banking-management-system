import { CABLE_FEE, nipCharge, PROVIDERS, purposeLabel } from '../data/catalog.js';
import { buildSeed } from '../data/seed.js';
import { addDaysISO, todayISO } from './dates.js';
import { convert, formatMoney, formatRate, moneyLt, parseAmount, round2 } from './money.js';
import { accountLine, normalizeBeneficiary, validateBeneficiary } from './validate.js';

export function currentProfile(state) {
  if (!state?.session) return null;
  return state.profiles.find((profile) => profile.id === state.session.profileId) || null;
}

export function makeId(prefix) {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const salt = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `${prefix}${stamp}${salt}`;
}

function withAudit(state, event) {
  const entry = {
    id: makeId('AUD'),
    at: new Date().toISOString(),
    bookDate: todayISO(),
    actor: event.actor || currentProfile(state)?.name || 'System',
    action: event.action,
    detail: event.detail,
    result: event.result || 'Success',
  };
  return { ...state, audit: [entry, ...state.audit].slice(0, 200) };
}

function refuse(state, error, action, detail) {
  return {
    ok: false,
    error,
    state: withAudit(state, {
      action,
      detail,
      result: 'Refused',
    }),
  };
}

function setBalance(account, balance) {
  const next = round2(balance);
  return { ...account, balance: next, available: round2(next - account.hold) };
}

function applyDelta(accounts, accountId, delta) {
  return accounts.map((account) => (
    account.id === accountId ? setBalance(account, account.balance + delta) : account
  ));
}

export function quotePayment({
  fromCurrency,
  toCurrency,
  paymentAmount,
  crossBorder = false,
  chargeBearer = 'SHA',
  waiveFee = false,
}) {
  const amount = round2(parseAmount(paymentAmount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter an amount greater than zero.' };
  }
  if (!fromCurrency || !toCurrency) {
    return { ok: false, error: 'Select the funding account and the destination currency.' };
  }
  const principal = round2(convert(amount, toCurrency, fromCurrency));
  const nairaPayment = toCurrency === 'NGN';
  let fee = 0;
  let feeCurrency = fromCurrency;
  let feeLabel = 'Cable charge';
  let bearer = chargeBearer;
  if (!waiveFee && nairaPayment) {
    fee = nipCharge(amount);
    feeCurrency = 'NGN';
    feeLabel = 'NIP charge';
    bearer = 'SHA';
  } else if (!waiveFee && fromCurrency !== 'NGN' && (crossBorder || fromCurrency !== toCurrency)) {
    fee = CABLE_FEE[fromCurrency] ?? 0;
    if (chargeBearer === 'OUR') fee = round2(fee * 1.75);
  }
  const feeInDebit = round2(convert(fee, feeCurrency, fromCurrency));
  const beneficiaryCharged = !nairaPayment && bearer === 'BEN' && fee > 0;
  const feeInPayment = beneficiaryCharged ? round2(convert(fee, feeCurrency, toCurrency)) : 0;
  if (beneficiaryCharged && feeInPayment >= amount) {
    return { ok: false, error: 'The beneficiary charge exceeds the payment amount.' };
  }
  const rateText = fromCurrency === toCurrency
    ? 'Same currency · no conversion'
    : `1 ${toCurrency} = ${formatRate(convert(1, toCurrency, fromCurrency))} ${fromCurrency}`;
  return {
    ok: true,
    error: null,
    paymentAmount: amount,
    paymentCurrency: toCurrency,
    principal,
    fee,
    feeCurrency,
    feeLabel,
    feeInDebit,
    totalDebit: beneficiaryCharged ? principal : round2(principal + feeInDebit),
    debitCurrency: fromCurrency,
    beneficiaryCredit: beneficiaryCharged ? round2(amount - feeInPayment) : amount,
    chargeBearer: fee > 0 ? bearer : 'SHA',
    rateText,
    fx: fromCurrency !== toCurrency,
    crossBorder: Boolean(crossBorder || fromCurrency !== toCurrency),
    rail: nairaPayment ? 'NIP' : '',
  };
}

function corridor(from, to) {
  if (from === to) return `Domestic ${from}`;
  return `${from} → ${to}`;
}

function resolveDestination(state, input, account) {
  if (input.destinationType === 'own') {
    const target = state.accounts.find((item) => item.id === input.targetAccountId);
    if (!target || target.id === account.id) {
      return { error: 'Choose a different Oakwood receiving account.' };
    }
    return {
      paymentCurrency: target.currency,
      country: target.region,
      counterpartyName: target.name,
      counterpartyDetail: `${target.bank} · ${target.identifiers[0].value}`,
      waiveFee: true,
      crossBorder: false,
      internal: true,
      target,
      type: 'SWEEP',
    };
  }

  if (input.destinationType === 'manual') {
    const validation = validateBeneficiary(input.manual || {});
    if (validation) return { error: validation };
    const manual = normalizeBeneficiary({ ...input.manual, id: makeId('BEN') });
    return {
      paymentCurrency: manual.currency,
      country: manual.country,
      counterpartyName: manual.name,
      counterpartyDetail: `${manual.bankName} · ${accountLine(manual)}`,
      waiveFee: false,
      crossBorder: account.region !== manual.country,
      internal: false,
      target: null,
      manual,
      type: input.purpose === 'PAYR' ? 'PAYROLL' : 'WIRE_OUT',
    };
  }

  const beneficiary = state.beneficiaries.find((item) => item.id === input.beneficiaryId);
  if (!beneficiary) return { error: 'Select a beneficiary.' };
  return {
    paymentCurrency: beneficiary.currency,
    country: beneficiary.country,
    counterpartyName: beneficiary.name,
    counterpartyDetail: `${beneficiary.bankName} · ${accountLine(beneficiary)}`,
    waiveFee: false,
    crossBorder: account.region !== beneficiary.country,
    internal: false,
    target: null,
    beneficiary,
    type: input.purpose === 'PAYR' ? 'PAYROLL' : 'WIRE_OUT',
  };
}

export function assessTransfer(state, input) {
  const account = state.accounts.find((item) => item.id === input.accountId);
  if (!account) return { ok: false, error: 'Select a funding account.' };
  const destination = resolveDestination(state, input, account);
  if (destination.error) return { ok: false, error: destination.error };
  if (!input.purpose) return { ok: false, error: 'Select a purpose code.' };
  const narrative = input.narrative?.trim() || '';
  const valueDate = input.valueDate || todayISO();
  const today = todayISO();
  const quote = quotePayment({
    fromCurrency: account.currency,
    toCurrency: destination.paymentCurrency,
    paymentAmount: input.amount,
    crossBorder: destination.crossBorder,
    chargeBearer: input.chargeBearer || 'SHA',
    waiveFee: destination.waiveFee,
  });
  if (!quote.ok) return quote;
  if (narrative.length < 3) return { ok: false, error: 'Enter a narration of at least 3 characters.', quote };
  if (narrative.length > 140) return { ok: false, error: 'Keep the narration to 140 characters.', quote };
  if (valueDate < today) return { ok: false, error: 'Value date cannot be in the past.', quote };
  if (input.scheduled && valueDate <= today) return { ok: false, error: 'Choose a future date for a scheduled payment.', quote };
  if (valueDate > addDaysISO(today, 30)) return { ok: false, error: 'Value date must be within 30 days.', quote };
  if (moneyLt(account.available, quote.totalDebit)) {
    return {
      ok: false,
      error: `Available balance in ${account.name} is ${formatMoney(account.available, account.currency)}. This instruction debits ${formatMoney(quote.totalDebit, account.currency)}.`,
      quote,
    };
  }
  const usd = convert(quote.paymentAmount, quote.paymentCurrency, 'USD');
  return {
    ok: true,
    error: null,
    warning: usd >= 1000000 ? 'This instruction is above USD 1,000,000 equivalent. It settles immediately in this specimen.' : null,
    quote,
    resolved: {
      ...destination,
      account,
      narrative,
      purpose: input.purpose,
      valueDate,
      status: valueDate > today ? 'Scheduled' : 'Settled',
    },
  };
}

function buildReceipt({
  title,
  reference,
  status,
  account,
  counterpartyName,
  counterpartyDetail,
  narrative,
  purpose,
  quote,
  valueDate,
  corridorText,
  lines,
}) {
  return {
    title,
    reference,
    createdAt: new Date().toISOString(),
    bookDate: todayISO(),
    status,
    accountName: account.name,
    bank: account.bank,
    currency: account.currency,
    counterparty: counterpartyName,
    counterpartyDetail,
    narrative,
    corridor: corridorText,
    purpose: purpose ? purposeLabel(purpose) : null,
    valueDate,
    quote,
    lines: lines || null,
  };
}

function pushMovement(list, spec) {
  list.push({
    id: makeId('TX'),
    reference: spec.reference,
    status: spec.status || 'Settled',
    batchId: spec.batchId || null,
    date: new Date().toISOString(),
    bookDate: todayISO(),
    accountId: spec.accountId,
    counterparty: spec.counterparty,
    narrative: spec.narrative,
    type: spec.type,
    corridor: spec.corridor,
    currency: spec.currency,
    amount: round2(spec.amount),
    meta: spec.meta || null,
  });
}

export function applyTransfer(state, input) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const assessed = assessTransfer(state, input);
  if (!assessed.ok) return { ok: false, error: assessed.error, state };
  if (input.pin !== profile.pin) {
    return refuse(state, 'The transaction PIN is incorrect.', 'Authorization failed', 'Incorrect transaction PIN on a single transfer.');
  }

  const { quote, resolved } = assessed;
  const reference = makeId('OFWT');
  let accounts = applyDelta(state.accounts, resolved.account.id, -quote.totalDebit);
  let beneficiaries = state.beneficiaries;
  if (resolved.manual?.id && input.manual?.save) {
    beneficiaries = [resolved.manual, ...beneficiaries];
  }
  if (resolved.target) {
    accounts = applyDelta(accounts, resolved.target.id, quote.beneficiaryCredit);
  }

  const path = corridor(resolved.account.region, resolved.country);
  const movements = [];
  const meta = {
    paymentAmount: quote.paymentAmount,
    paymentCurrency: quote.paymentCurrency,
    beneficiaryCredit: quote.beneficiaryCredit,
    fee: quote.fee,
    feeCurrency: quote.feeCurrency,
    feeLabel: quote.feeLabel,
    rateText: quote.rateText,
    chargeBearer: quote.chargeBearer,
    purpose: resolved.purpose,
    valueDate: resolved.valueDate,
    counterpartyDetail: resolved.counterpartyDetail,
  };
  pushMovement(movements, {
    reference,
    status: resolved.status,
    accountId: resolved.account.id,
    counterparty: resolved.counterpartyName,
    narrative: resolved.narrative,
    type: resolved.type,
    corridor: path,
    currency: resolved.account.currency,
    amount: -quote.principal,
    meta,
  });
  if (quote.fee > 0 && quote.chargeBearer !== 'BEN') {
    pushMovement(movements, {
      reference,
      accountId: resolved.account.id,
      counterparty: 'Oakwood Finance',
      narrative: `Cable charge · ${reference}`,
      type: 'FEE',
      corridor: path,
      currency: resolved.account.currency,
      amount: -quote.fee,
    });
  }
  if (resolved.target) {
    pushMovement(movements, {
      reference,
      accountId: resolved.target.id,
      counterparty: resolved.account.name,
      narrative: resolved.narrative,
      type: 'SWEEP',
      corridor: path,
      currency: resolved.target.currency,
      amount: quote.beneficiaryCredit,
      meta,
      status: resolved.status,
    });
  }

  const receipt = buildReceipt({
    title: resolved.internal ? 'Book transfer advice' : 'Payment confirmation',
    reference,
    status: resolved.status,
    account: resolved.account,
    counterpartyName: resolved.counterpartyName,
    counterpartyDetail: resolved.counterpartyDetail,
    narrative: resolved.narrative,
    purpose: resolved.purpose,
    quote,
    valueDate: resolved.valueDate,
    corridorText: path,
  });

  const next = withAudit({
    ...state,
    accounts,
    beneficiaries,
    transactions: [...movements, ...state.transactions],
  }, {
    action: resolved.internal ? 'Book transfer' : 'Wire authorized',
    detail: `${reference} · ${resolved.counterpartyName} · ${formatMoney(quote.totalDebit, quote.debitCurrency)}`,
  });
  return { ok: true, state: next, receipt };
}

export function assessBulk(state, input) {
  const purpose = String(input.purpose || '').trim();
  if (purpose.length < 3) return { ok: false, error: 'Enter a batch purpose of at least 3 characters.' };
  if (purpose.length > 80) return { ok: false, error: 'Keep the batch purpose to 80 characters.' };
  const rows = (input.rows || []).filter((row) => row.beneficiaryId || row.manual || String(row.amount || '').trim() || row.narrative);
  if (rows.length === 0) return { ok: false, error: 'Add at least one payment line.' };
  if (rows.length > 20) return { ok: false, error: 'A specimen batch is limited to 20 lines.' };
  const quoted = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const line = assessTransfer(state, {
      accountId: row.accountId,
      destinationType: row.manual ? 'manual' : 'beneficiary',
      beneficiaryId: row.beneficiaryId,
      manual: row.manual,
      amount: row.amount,
      purpose,
      narrative: row.narrative,
      chargeBearer: 'SHA',
      valueDate: todayISO(),
    });
    if (!line.ok) return { ok: false, error: `Line ${index + 1}: ${line.error}` };
    quoted.push(line);
  }
  const totals = {};
  for (const line of quoted) {
    const id = line.resolved.account.id;
    totals[id] = round2((totals[id] || 0) + line.quote.totalDebit);
  }
  for (const [id, total] of Object.entries(totals)) {
    const account = state.accounts.find((item) => item.id === id);
    if (moneyLt(account.available, total)) {
      return {
        ok: false,
        error: `${account.name} needs ${formatMoney(total, account.currency)} across this batch. Available is ${formatMoney(account.available, account.currency)}.`,
      };
    }
  }
  const seen = new Set();
  const duplicates = [];
  for (const line of quoted) {
    const key = `${line.resolved.beneficiary?.id || line.resolved.counterpartyName}|${line.quote.paymentAmount}|${line.quote.paymentCurrency}`;
    if (seen.has(key)) duplicates.push(line.resolved.counterpartyName);
    seen.add(key);
  }
  return { ok: true, quoted, totals, duplicates };
}

export function applyBulk(state, input) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const assessed = assessBulk(state, input);
  if (!assessed.ok) return { ok: false, error: assessed.error, state };
  if (input.pin !== profile.pin) {
    return refuse(state, 'The transaction PIN is incorrect.', 'Authorization failed', 'Incorrect transaction PIN on a batch.');
  }

  const batchId = makeId('OFB');
  let accounts = state.accounts;
  const movements = [];
  const lines = [];
  for (const line of assessed.quoted) {
    const { quote, resolved } = line;
    const reference = makeId('OFWT');
    accounts = applyDelta(accounts, resolved.account.id, -quote.totalDebit);
    const path = corridor(resolved.account.region, resolved.country);
    const meta = {
      paymentAmount: quote.paymentAmount,
      paymentCurrency: quote.paymentCurrency,
      beneficiaryCredit: quote.beneficiaryCredit,
      fee: quote.fee,
      feeCurrency: quote.feeCurrency,
      feeLabel: quote.feeLabel,
      rateText: quote.rateText,
      chargeBearer: 'SHA',
      purpose: String(input.purpose || '').trim(),
      valueDate: todayISO(),
      counterpartyDetail: resolved.counterpartyDetail,
      batchId,
    };
    pushMovement(movements, {
      reference,
      batchId,
      accountId: resolved.account.id,
      counterparty: resolved.counterpartyName,
      narrative: resolved.narrative,
      type: resolved.type,
      corridor: path,
      currency: resolved.account.currency,
      amount: -quote.principal,
      meta,
    });
    if (quote.fee > 0) {
      pushMovement(movements, {
        reference,
        batchId,
        accountId: resolved.account.id,
        counterparty: 'Oakwood Finance',
        narrative: `Cable charge · ${reference}`,
        type: 'FEE',
        corridor: path,
        currency: resolved.account.currency,
        amount: -quote.fee,
      });
    }
    lines.push({
      reference,
      counterparty: resolved.counterpartyName,
      account: resolved.account.name,
      payment: formatMoney(quote.paymentAmount, quote.paymentCurrency),
      debit: formatMoney(quote.totalDebit, quote.debitCurrency),
    });
  }

  const receipt = {
    title: 'Batch confirmation',
    reference: batchId,
    createdAt: new Date().toISOString(),
    bookDate: todayISO(),
    status: 'Settled',
    accountName: 'Multiple posting accounts',
    bank: 'Oakwood Finance',
    currency: null,
    counterparty: `${lines.length} beneficiaries`,
    counterpartyDetail: 'SHA charge bearer on each cross-border or FX line',
    narrative: purposeLabel(String(input.purpose || '').trim()),
    corridor: 'Mixed',
    purpose: purposeLabel(String(input.purpose || '').trim()),
    valueDate: todayISO(),
    quote: null,
    lines,
  };

  const next = withAudit({
    ...state,
    accounts,
    transactions: [...movements, ...state.transactions],
  }, {
    action: 'Batch authorized',
    detail: `${batchId} · ${lines.length} lines`,
  });
  return { ok: true, state: next, receipt };
}

export function applyBill(state, input) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const provider = PROVIDERS.find((item) => item.id === input.providerId);
  const account = state.accounts.find((item) => item.id === input.accountId);
  if (!provider) return { ok: false, error: 'Select a biller.', state };
  if (!account) return { ok: false, error: 'Select a funding account.', state };
  const reference = input.customerReference?.trim() || '';
  if (reference.length < 3) return { ok: false, error: 'Enter the biller account or invoice reference.', state };
  const quote = quotePayment({
    fromCurrency: account.currency,
    toCurrency: provider.currency,
    paymentAmount: input.amount,
    waiveFee: true,
  });
  if (!quote.ok) return { ok: false, error: quote.error, state };
  if (moneyLt(account.available, quote.totalDebit)) {
    return {
      ok: false,
      error: `Available balance in ${account.name} is ${formatMoney(account.available, account.currency)}. This bill debits ${formatMoney(quote.totalDebit, account.currency)}.`,
      state,
    };
  }
  if (input.pin !== profile.pin) {
    return refuse(state, 'The transaction PIN is incorrect.', 'Authorization failed', `Incorrect transaction PIN for ${provider.name}.`);
  }

  const paymentReference = makeId('OFBP');
  const accounts = applyDelta(state.accounts, account.id, -quote.totalDebit);
  const movements = [];
  pushMovement(movements, {
    reference: paymentReference,
    accountId: account.id,
    counterparty: provider.name,
    narrative: `${provider.name} · ${reference}`,
    type: 'BILL',
    corridor: corridor(account.region, provider.region),
    currency: account.currency,
    amount: -quote.totalDebit,
    meta: {
      paymentAmount: quote.paymentAmount,
      paymentCurrency: quote.paymentCurrency,
      beneficiaryCredit: quote.paymentAmount,
      fee: 0,
      feeCurrency: account.currency,
      rateText: quote.rateText,
      chargeBearer: 'SHA',
      purpose: 'SUPP',
      valueDate: todayISO(),
      counterpartyDetail: `${provider.category} · ${reference}`,
    },
  });
  const receipt = buildReceipt({
    title: 'Bill payment advice',
    reference: paymentReference,
    status: 'Settled',
    account,
    counterpartyName: provider.name,
    counterpartyDetail: `${provider.category} · ${reference}`,
    narrative: `${provider.name} · ${reference}`,
    purpose: 'SUPP',
    quote,
    valueDate: todayISO(),
    corridorText: corridor(account.region, provider.region),
  });
  const next = withAudit({
    ...state,
    accounts,
    transactions: [...movements, ...state.transactions],
  }, {
    action: 'Bill payment',
    detail: `${provider.name} · ${formatMoney(quote.totalDebit, account.currency)}`,
  });
  return { ok: true, state: next, receipt };
}

export function saveBeneficiary(state, input) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const validation = validateBeneficiary(input);
  if (validation) return { ok: false, error: validation, state };
  if (input.pin !== profile.pin) {
    return refuse(state, 'The transaction PIN is incorrect.', 'Authorization failed', 'Incorrect transaction PIN while saving a beneficiary.');
  }
  const beneficiary = normalizeBeneficiary({ ...input, id: input.id || makeId('BEN') });
  const beneficiaries = input.id
    ? state.beneficiaries.map((item) => (item.id === input.id ? beneficiary : item))
    : [beneficiary, ...state.beneficiaries];
  const next = withAudit({ ...state, beneficiaries }, {
    action: 'Beneficiary saved',
    detail: `${beneficiary.name} · ${beneficiary.country}`,
  });
  return { ok: true, state: next, beneficiary };
}

export function removeBeneficiary(state, { id, pin }) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const beneficiary = state.beneficiaries.find((item) => item.id === id);
  if (!beneficiary) return { ok: false, error: 'That beneficiary is no longer on the directory.', state };
  if (pin !== profile.pin) {
    return refuse(state, 'The transaction PIN is incorrect.', 'Authorization failed', 'Incorrect transaction PIN while removing a beneficiary.');
  }
  const next = withAudit({
    ...state,
    beneficiaries: state.beneficiaries.filter((item) => item.id !== id),
  }, {
    action: 'Beneficiary removed',
    detail: beneficiary.name,
  });
  return { ok: true, state: next };
}

function updateProfile(state, profileId, patch) {
  return {
    ...state,
    profiles: state.profiles.map((profile) => (profile.id === profileId ? { ...profile, ...patch } : profile)),
  };
}

export function changePassword(state, { current, next, confirm }) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  if (current !== profile.password) return { ok: false, error: 'The current password does not match.', state };
  if (!next || next.length < 10 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
    return { ok: false, error: 'Use at least 10 characters with a letter and a number.', state };
  }
  if (next !== confirm) return { ok: false, error: 'The new password and confirmation do not match.', state };
  if (next === current) return { ok: false, error: 'Choose a password that differs from the current one.', state };
  const stamped = updateProfile(state, profile.id, { password: next, passwordChangedAt: new Date().toISOString() });
  return {
    ok: true,
    state: withAudit(stamped, { action: 'Password changed', detail: 'Sign-in password updated on this specimen.' }),
  };
}

export function changePin(state, { current, next, confirm }) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  if (current !== profile.pin) return { ok: false, error: 'The current PIN does not match.', state };
  if (!/^\d{6}$/.test(next || '')) return { ok: false, error: 'The new PIN must be 6 digits.', state };
  if (next !== confirm) return { ok: false, error: 'The new PIN and confirmation do not match.', state };
  if (next === current) return { ok: false, error: 'Choose a PIN that differs from the current one.', state };
  const stamped = updateProfile(state, profile.id, { pin: next });
  return {
    ok: true,
    state: withAudit(stamped, { action: 'PIN changed', detail: 'Transaction PIN updated on this specimen.' }),
  };
}

export function setMfa(state, patch) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const mfa = { ...profile.mfa, ...patch };
  if (!mfa.authenticator && !mfa.sms && !mfa.email) {
    return { ok: false, error: 'Keep at least one sign-in method available.', state };
  }
  const stamped = updateProfile(state, profile.id, { mfa });
  return {
    ok: true,
    state: withAudit(stamped, { action: 'MFA preferences updated', detail: 'Specimen sign-in preferences saved. No code was sent.' }),
  };
}

export function pmt(principal, annualRate, months) {
  if (months <= 0) return 0;
  const monthly = annualRate / 12;
  if (monthly === 0) return principal / months;
  const factor = (1 + monthly) ** months;
  return (principal * monthly * factor) / (factor - 1);
}

export function schedule(principal, annualRate, months) {
  const rows = [];
  let balance = round2(principal);
  const payment = pmt(principal, annualRate, months);
  for (let index = 1; index <= months && balance > 0; index += 1) {
    const interest = round2(balance * annualRate / 12);
    let principalPart = round2(payment - interest);
    if (index === months || principalPart > balance) principalPart = balance;
    if (principalPart < 0) principalPart = 0;
    const due = round2(principalPart + interest);
    balance = round2(Math.max(0, balance - principalPart));
    rows.push({ index, payment: due, interest, principal: principalPart, balance });
  }
  return rows;
}

export function nextInstallment(facility) {
  if (!facility || facility.kind !== 'term' || facility.drawn <= 0 || facility.remainingMonths <= 0) return null;
  const rows = schedule(facility.drawn, facility.rate, facility.remainingMonths);
  return rows[0] || null;
}

function accountForCurrency(state, currency) {
  return state.accounts.find((account) => account.currency === currency) || null;
}

export function drawFacility(state, input) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const facility = state.facilities.find((item) => item.id === input.facilityId);
  if (!facility || facility.kind !== 'revolver') return { ok: false, error: 'Drawdown is available on the revolving facility.', state };
  if (facility.status !== 'Active') return { ok: false, error: 'This facility is not available to draw.', state };
  const amount = round2(parseAmount(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a draw amount greater than zero.', state };
  const headroom = round2(facility.limit - facility.drawn);
  if (moneyLt(headroom, amount)) {
    return { ok: false, error: `Undrawn headroom is ${formatMoney(headroom, facility.currency)}.`, state };
  }
  const account = accountForCurrency(state, facility.currency);
  if (!account) return { ok: false, error: 'No posting account matches this facility currency.', state };
  if (input.pin !== profile.pin) {
    return refuse(state, 'The transaction PIN is incorrect.', 'Authorization failed', 'Incorrect transaction PIN on a credit draw.');
  }
  const reference = makeId('OFDR');
  const accounts = applyDelta(state.accounts, account.id, amount);
  const facilities = state.facilities.map((item) => (
    item.id === facility.id ? { ...item, drawn: round2(item.drawn + amount) } : item
  ));
  const movements = [];
  pushMovement(movements, {
    reference,
    accountId: account.id,
    counterparty: 'Oakwood Finance',
    narrative: `Drawdown · ${facility.shortName}`,
    type: 'DRAW',
    corridor: `Domestic ${account.region}`,
    currency: account.currency,
    amount,
  });
  const receipt = buildReceipt({
    title: 'Credit draw advice',
    reference,
    status: 'Settled',
    account,
    counterpartyName: facility.name,
    counterpartyDetail: facility.rateLabel,
    narrative: `Drawdown · ${facility.shortName}`,
    purpose: 'LOAN',
    quote: {
      paymentAmount: amount,
      paymentCurrency: facility.currency,
      principal: amount,
      fee: 0,
      feeCurrency: facility.currency,
      totalDebit: amount,
      debitCurrency: facility.currency,
      beneficiaryCredit: amount,
      rateText: 'Same currency · no conversion',
      chargeBearer: 'SHA',
    },
    valueDate: todayISO(),
    corridorText: `Domestic ${account.region}`,
  });
  const next = withAudit({
    ...state,
    accounts,
    facilities,
    transactions: [...movements, ...state.transactions],
  }, {
    action: 'Credit draw',
    detail: `${reference} · ${formatMoney(amount, facility.currency)}`,
  });
  return { ok: true, state: next, receipt };
}

export function repayFacility(state, input) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const facility = state.facilities.find((item) => item.id === input.facilityId);
  if (!facility) return { ok: false, error: 'Select a facility.', state };
  const account = accountForCurrency(state, facility.currency);
  if (!account) return { ok: false, error: 'No posting account matches this facility currency.', state };

  let debit = 0;
  let principal = 0;
  let narrative = '';
  let nextFacility = facility;

  if (facility.kind === 'revolver') {
    const amount = round2(parseAmount(input.amount));
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a repayment amount greater than zero.', state };
    if (moneyLt(facility.drawn, amount)) return { ok: false, error: `Outstanding drawn balance is ${formatMoney(facility.drawn, facility.currency)}.`, state };
    debit = amount;
    principal = amount;
    narrative = `Principal repayment · ${facility.shortName}`;
    const drawn = round2(facility.drawn - amount);
    nextFacility = { ...facility, drawn, status: drawn <= 0 ? 'Repaid' : facility.status };
  } else {
    const installment = nextInstallment(facility);
    if (!installment) return { ok: false, error: 'This term loan has no instalment due.', state };
    debit = installment.payment;
    principal = installment.principal;
    narrative = `Instalment ${facility.remainingMonths} remaining · interest ${formatMoney(installment.interest, facility.currency)}`;
    const drawn = round2(Math.max(0, facility.drawn - principal));
    const remainingMonths = facility.remainingMonths - 1;
    nextFacility = {
      ...facility,
      drawn,
      remainingMonths,
      status: drawn <= 0 || remainingMonths <= 0 ? 'Repaid' : facility.status,
    };
  }

  if (moneyLt(account.available, debit)) {
    return {
      ok: false,
      error: `Available balance in ${account.name} is ${formatMoney(account.available, account.currency)}. This repayment debits ${formatMoney(debit, account.currency)}.`,
      state,
    };
  }
  if (input.pin !== profile.pin) {
    return refuse(state, 'The transaction PIN is incorrect.', 'Authorization failed', 'Incorrect transaction PIN on a loan repayment.');
  }

  const reference = makeId('OFRP');
  const accounts = applyDelta(state.accounts, account.id, -debit);
  const facilities = state.facilities.map((item) => (item.id === facility.id ? nextFacility : item));
  const movements = [];
  pushMovement(movements, {
    reference,
    accountId: account.id,
    counterparty: 'Oakwood Finance',
    narrative,
    type: 'REPAY',
    corridor: `Domestic ${account.region}`,
    currency: account.currency,
    amount: -debit,
    meta: {
      paymentAmount: debit,
      paymentCurrency: account.currency,
      beneficiaryCredit: principal,
      fee: 0,
      feeCurrency: account.currency,
      rateText: 'Same currency · no conversion',
      chargeBearer: 'SHA',
      purpose: 'LOAN',
      valueDate: todayISO(),
      counterpartyDetail: facility.rateLabel,
    },
  });
  const receipt = buildReceipt({
    title: 'Repayment advice',
    reference,
    status: 'Settled',
    account,
    counterpartyName: facility.name,
    counterpartyDetail: facility.rateLabel,
    narrative,
    purpose: 'LOAN',
    quote: {
      paymentAmount: debit,
      paymentCurrency: account.currency,
      principal: debit,
      fee: 0,
      feeCurrency: account.currency,
      totalDebit: debit,
      debitCurrency: account.currency,
      beneficiaryCredit: principal,
      rateText: 'Same currency · no conversion',
      chargeBearer: 'SHA',
    },
    valueDate: todayISO(),
    corridorText: `Domestic ${account.region}`,
  });
  const next = withAudit({
    ...state,
    accounts,
    facilities,
    transactions: [...movements, ...state.transactions],
  }, {
    action: 'Loan repayment',
    detail: `${reference} · ${formatMoney(debit, account.currency)}`,
  });
  return { ok: true, state: next, receipt };
}

export function applyForCredit(state, input) {
  const profile = currentProfile(state);
  if (!profile) return { ok: false, error: 'Sign in to continue.', state };
  const amount = round2(parseAmount(input.amount));
  const tenor = Number(input.tenorMonths);
  if (!input.type) return { ok: false, error: 'Select a facility type.', state };
  if (!['USD', 'GBP', 'NGN'].includes(input.currency)) return { ok: false, error: 'Select a currency.', state };
  if (!Number.isFinite(amount) || amount < 50000) return { ok: false, error: 'The minimum request on this specimen is 50,000.', state };
  if (amount > 15000000) return { ok: false, error: 'Requests above 15,000,000 need a relationship review outside this specimen.', state };
  if (!Number.isInteger(tenor) || tenor < 6 || tenor > 60) return { ok: false, error: 'Tenor must be between 6 and 60 months.', state };
  const purpose = input.purpose?.trim() || '';
  if (purpose.length < 8) return { ok: false, error: 'Describe the use of proceeds in a short sentence.', state };
  const application = {
    id: makeId('APP'),
    reference: makeId('OFCR'),
    submittedAt: new Date().toISOString(),
    type: input.type,
    currency: input.currency,
    amount,
    tenorMonths: tenor,
    purpose,
    status: 'In review',
  };
  const next = withAudit({
    ...state,
    applications: [application, ...state.applications],
  }, {
    action: 'Credit request',
    detail: `${application.reference} · ${formatMoney(amount, input.currency)}`,
  });
  return { ok: true, state: next, application };
}

export function authenticate(state, { companyId, userId, password }) {
  const company = companyId.trim().toUpperCase();
  const user = userId.trim().toUpperCase();
  if (!company || !user || !password) {
    return { ok: false, error: 'Enter the company ID, user ID, and password.', state };
  }
  const profile = state.profiles.find((item) => item.companyId.toUpperCase() === company && item.userId.toUpperCase() === user);
  if (!profile || profile.password !== password) {
    return {
      ok: false,
      error: 'Those credentials do not match a mandate on this specimen.',
      state: withAudit(state, {
        actor: user,
        action: 'Sign-in refused',
        detail: 'Credentials did not match a mandate.',
        result: 'Refused',
      }),
    };
  }
  const at = new Date().toISOString();
  const signedIn = updateProfile({ ...state, session: { profileId: profile.id, at } }, profile.id, { lastLogin: at });
  return {
    ok: true,
    state: withAudit(signedIn, {
      actor: profile.name,
      action: 'Signed in',
      detail: `${profile.title} · ${profile.location}`,
    }),
  };
}

export function signOut(state) {
  const profile = currentProfile(state);
  return withAudit({ ...state, session: null }, {
    actor: profile?.name || 'User',
    action: 'Signed out',
    detail: 'Session closed in this browser.',
  });
}

export function restoreDemo(state) {
  const session = state.session;
  const next = buildSeed(session);
  if (session) {
    next.profiles = next.profiles.map((profile) => (
      profile.id === session.profileId ? { ...profile, lastLogin: session.at } : profile
    ));
  }
  return withAudit(next, {
    actor: currentProfile(next)?.name || 'User',
    action: 'Demo data restored',
    detail: 'Specimen ledger, payees, credentials, and facilities were restored.',
  });
}

export function recordAudit(state, action, detail) {
  return withAudit(state, { action, detail });
}
