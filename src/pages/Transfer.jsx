import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentStatus } from '../components/PaymentStatus';
import { Button, Card, Field, PinDialog, Select, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { CHARGE_BEARERS, CORRESPONDENTS, COUNTRIES } from '../data/catalog';
import { addDaysISO, formatDay, todayISO } from '../lib/dates';
import { assessTransfer } from '../lib/ledger';
import { formatAmountFixed, formatAmountInput, formatMoney } from '../lib/money';
import { accountLine, countryName, validateBeneficiary } from '../lib/validate';

const EMPTY_MANUAL = {
  name: '',
  country: 'US',
  currency: 'USD',
  type: 'Vendor',
  bankName: '',
  bankCode: '',
  accountNumber: '',
  swift: '',
  save: false,
};

export function Transfer() {
  const bank = useBank();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState(() => {
    const accountId = bank.accounts.some((account) => account.id === params.get('from')) ? params.get('from') : 'usd';
    return {
    accountId,
    destinationType: 'beneficiary',
    beneficiaryId: bank.beneficiaries.some((item) => item.id === params.get('beneficiary')) ? params.get('beneficiary') : (bank.beneficiaries[0]?.id || ''),
    targetAccountId: bank.accounts.find((account) => account.id !== accountId)?.id || 'gbp',
    manual: EMPTY_MANUAL,
    amount: '',
    purpose: 'SUPP',
    narrative: '',
    chargeBearer: 'SHA',
    timing: 'instant',
    valueDate: todayISO(),
  };
  });
  const [attempted, setAttempted] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [outcome, setOutcome] = useState(null);

  function instruction(source) {
    return {
      ...source,
      valueDate: source.timing === 'instant' ? todayISO() : source.valueDate,
      scheduled: source.timing === 'schedule',
    };
  }

  const assessment = useMemo(
    () => assessTransfer(bank.snapshot, instruction(form)),
    [bank.snapshot, form],
  );
  const account = bank.accounts.find((item) => item.id === form.accountId);
  const beneficiary = bank.beneficiaries.find((item) => item.id === form.beneficiaryId);
  const paymentCurrency = form.destinationType === 'own'
    ? bank.accounts.find((item) => item.id === form.targetAccountId)?.currency
    : form.destinationType === 'manual'
      ? form.manual.currency
      : beneficiary?.currency;
  const nairaTransfer = paymentCurrency === 'NGN';
  const quote = assessment.quote;
  const showError = attempted && !assessment.ok;

  function patch(partial) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function onAuthorize() {
    setAttempted(true);
    const next = assessTransfer(bank.snapshot, instruction(form));
    if (!next.ok) return;
    setPinError('');
    setPinOpen(true);
  }

  function onPin(pin) {
    const result = bank.transfer({ ...instruction(form), pin });
    if (!result.ok && /pin/i.test(result.error)) {
      setPinError(result.error);
      return;
    }
    setPinOpen(false);
    setPinError('');
    setOutcome({
      phase: 'processing',
      receipt: result.ok ? result.receipt : null,
      error: result.ok ? '' : result.error,
      printError: '',
    });
    if (result.ok) {
      setAttempted(false);
      setForm((current) => ({ ...current, amount: '', narrative: '' }));
    }
  }

  function settleOutcome() {
    setOutcome((current) => {
      if (!current || current.phase !== 'processing') return current;
      return { ...current, phase: current.receipt ? 'success' : 'failed' };
    });
  }

  function finishPayment() {
    setOutcome(null);
    navigate('/');
  }

  function dismissFailure() {
    setOutcome(null);
  }

  let route = 'Select a destination to run the routing check.';
  let routeTone = 'text-slate-500';
  if (form.destinationType === 'own') {
    const target = bank.accounts.find((item) => item.id === form.targetAccountId);
    route = target ? `Internal book transfer into ${target.name}. No correspondent bank is involved.` : route;
    routeTone = 'text-emerald-800';
  } else if (form.destinationType === 'beneficiary' && beneficiary) {
    const correspondent = CORRESPONDENTS[beneficiary.country];
    const beneficiarySwift = beneficiary.country === 'NG' || !beneficiary.swift ? '' : ` (${beneficiary.swift})`;
    route = `Passed · ${correspondent.bank}, ${correspondent.city} (${correspondent.swift}) → ${beneficiary.bankName}${beneficiarySwift} · cutoff ${correspondent.cutoff}`;
    routeTone = 'text-emerald-800';
  } else if (form.destinationType === 'manual') {
    const validation = validateBeneficiary(form.manual);
    if (validation) {
      route = `Check the destination details. ${validation}`;
      routeTone = 'text-rose-700';
    } else {
      const correspondent = CORRESPONDENTS[form.manual.country];
      route = `Passed · ${correspondent.bank} (${correspondent.swift}) · cutoff ${correspondent.cutoff}`;
      routeTone = 'text-emerald-800';
    }
  }

  const codeLabel = form.manual.country === 'US' ? 'Routing number' : form.manual.country === 'GB' ? 'Sort code' : 'Bank code';
  const accountLabel = form.manual.country === 'NG' ? 'NUBAN' : 'Account number';

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <div className="space-y-4">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Payments</p>
          <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Single transfer</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Domestic and cross-border wires across the United States, the United Kingdom, and Nigeria. The amount is what the counterparty should receive before a BEN charge.</p>
        </header>

        <Card className="space-y-4 p-4">
          <Field label="Funding account" hint={account ? `Available ${formatMoney(account.available, account.currency)} · Hold ${formatMoney(account.hold, account.currency)}` : ''}>
            <Select value={form.accountId} onChange={(event) => {
              const accountId = event.target.value;
              const targetAccountId = form.targetAccountId === accountId
                ? bank.accounts.find((item) => item.id !== accountId)?.id
                : form.targetAccountId;
              patch({ accountId, targetAccountId });
            }}>
              {bank.accounts.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.available, item.currency)} available</option>
              ))}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">Destination</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ['beneficiary', 'Saved beneficiary'],
                ['own', 'Own Oakwood account'],
                ['manual', 'New beneficiary'],
              ].map(([id, label]) => (
                <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs ${form.destinationType === id ? 'border-pine bg-emerald-50 text-pine' : 'border-emerald-100 text-slate-600'}`}>
                  <input
                    type="radio"
                    name="destination"
                    checked={form.destinationType === id}
                    onChange={() => patch({ destinationType: id, purpose: id === 'own' ? 'CASH' : 'SUPP' })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {form.destinationType === 'beneficiary' && (
            <Field label="Beneficiary" hint={beneficiary ? `${countryName(beneficiary.country)} · ${beneficiary.bankName} · ${accountLine(beneficiary)}` : ''}>
              <Select value={form.beneficiaryId} onChange={(event) => patch({ beneficiaryId: event.target.value })}>
                {bank.beneficiaries.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.currency} · {item.country}</option>
                ))}
              </Select>
            </Field>
          )}

          {form.destinationType === 'own' && (
            <Field label="Receiving account">
              <Select value={form.targetAccountId} onChange={(event) => patch({ targetAccountId: event.target.value })}>
                {bank.accounts.filter((item) => item.id !== form.accountId).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </Field>
          )}

          {form.destinationType === 'manual' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <TextInput value={form.manual.name} onChange={(event) => patch({ manual: { ...form.manual, name: event.target.value } })} />
              </Field>
              <Field label="Country">
                <Select value={form.manual.country} onChange={(event) => {
                  const country = event.target.value;
                  const currency = COUNTRIES.find((item) => item.code === country)?.currency || 'USD';
                  patch({ manual: { ...form.manual, country, currency } });
                }}>
                  {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                </Select>
              </Field>
              <Field label="Currency">
                <Select value={form.manual.currency} onChange={(event) => patch({ manual: { ...form.manual, currency: event.target.value } })}>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="NGN">NGN</option>
                </Select>
              </Field>
              <Field label="Beneficiary bank">
                <TextInput value={form.manual.bankName} onChange={(event) => patch({ manual: { ...form.manual, bankName: event.target.value } })} />
              </Field>
              {form.manual.country !== 'NG' && (
                <Field label={codeLabel}>
                  <TextInput value={form.manual.bankCode} onChange={(event) => patch({ manual: { ...form.manual, bankCode: event.target.value } })} />
                </Field>
              )}
              <Field label={accountLabel}>
                <TextInput value={form.manual.accountNumber} onChange={(event) => patch({ manual: { ...form.manual, accountNumber: event.target.value } })} />
              </Field>
              {form.manual.country !== 'NG' && (
                <Field label="SWIFT / BIC" hint="Optional. 8 or 11 characters.">
                  <TextInput value={form.manual.swift} onChange={(event) => patch({ manual: { ...form.manual, swift: event.target.value } })} />
                </Field>
              )}
              <label className="flex items-center gap-2 self-end pb-2 text-xs text-ink">
                <input type="checkbox" checked={form.manual.save} onChange={(event) => patch({ manual: { ...form.manual, save: event.target.checked } })} />
                Save to the beneficiary directory
              </label>
            </div>
          )}

          <div className={`rounded-md border px-3 py-2 text-xs leading-relaxed ${routeTone} border-emerald-100 bg-emerald-50/40`}>
            <span className="font-semibold">Destination check. </span>{route}
          </div>
        </Card>

        <Card className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Beneficiary amount">
            <TextInput
              inputMode="decimal"
              value={form.amount}
              placeholder="0.00"
              onChange={(event) => patch({ amount: formatAmountInput(event.target.value) })}
              onBlur={(event) => patch({ amount: event.target.value ? formatAmountFixed(event.target.value) : '' })}
            />
          </Field>
          <Field label="Timing">
            <Select value={form.timing} onChange={(event) => {
              const timing = event.target.value;
              const today = todayISO();
              patch({
                timing,
                valueDate: timing === 'instant' ? today : (form.valueDate > today ? form.valueDate : addDaysISO(today, 1)),
              });
            }}>
              <option value="instant">Instant payment</option>
              <option value="schedule">Schedule payment</option>
            </Select>
          </Field>
          {form.timing === 'schedule' && (
            <Field label="Value date">
              <TextInput type="date" min={addDaysISO(todayISO(), 1)} max={addDaysISO(todayISO(), 30)} value={form.valueDate} onChange={(event) => patch({ valueDate: event.target.value })} />
            </Field>
          )}
          {!nairaTransfer && (
            <Field label="Charge bearer">
              <Select value={form.chargeBearer} onChange={(event) => patch({ chargeBearer: event.target.value })} disabled={form.destinationType === 'own'}>
                {CHARGE_BEARERS.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.hint}</option>)}
              </Select>
            </Field>
          )}
          <div className="sm:col-span-2">
            <Field label="Narration">
              <TextInput maxLength={140} value={form.narrative} placeholder="Narration" onChange={(event) => patch({ narrative: event.target.value })} />
            </Field>
          </div>
        </Card>
      </div>

      <Card className="h-fit p-4 xl:sticky xl:top-20">
        <h2 className="text-sm font-semibold text-pine">Payment details</h2>
        {!form.amount.trim() && <p className="mt-4 text-xs leading-relaxed text-slate-500">Enter an amount to see the payment details.</p>}
        {form.amount.trim() && quote && (
          <dl className="mt-3 divide-y divide-emerald-50 text-xs">
            <Ticket label="Debit amount" value={formatMoney(quote.principal, quote.debitCurrency)} />
            <Ticket
              label={quote.feeLabel || 'Cable charge'}
              value={quote.feeCurrency === quote.debitCurrency
                ? formatMoney(quote.fee, quote.feeCurrency)
                : `${formatMoney(quote.fee, quote.feeCurrency)} · ${formatMoney(quote.feeInDebit, quote.debitCurrency)}`}
            />
            <Ticket label="Total debit" value={formatMoney(quote.totalDebit, quote.debitCurrency)} strong />
            <Ticket label="Beneficiary receives" value={formatMoney(quote.beneficiaryCredit, quote.paymentCurrency)} />
            <Ticket label="Arrival" value={form.timing === 'schedule' && form.valueDate > todayISO() ? `Scheduled · ${formatDay(form.valueDate)}` : quote.rail === 'NIP' ? 'Instant · NIP' : quote.crossBorder ? 'T+1 banking day' : 'Same banking day, subject to cutoff'} />
          </dl>
        )}
        {form.amount.trim() && !quote && <p className="mt-4 text-xs text-rose-700">{assessment.error}</p>}
        {assessment.warning && <p className="mt-3 text-[11px] leading-relaxed text-amber-800">{assessment.warning}</p>}
        {showError && <p className="mt-3 text-xs text-rose-700" role="alert">{assessment.error}</p>}
        <Button className="mt-4 w-full" onClick={onAuthorize} disabled={!quote}>
          {quote ? `Authorize debit of ${formatMoney(quote.totalDebit, quote.debitCurrency)}` : 'Authorize'}
        </Button>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Authorization uses the mandate PIN. Funds move immediately on the specimen ledger.</p>
      </Card>

      <PinDialog
        open={pinOpen}
        title="Authorize instruction"
        detail={quote ? `Debit ${formatMoney(quote.totalDebit, quote.debitCurrency)} from ${account?.name}` : ''}
        error={pinError}
        onClose={() => setPinOpen(false)}
        onSubmit={onPin}
      />
      <PaymentStatus outcome={outcome} onDone={finishPayment} onDismiss={dismissFailure} onSettled={settleOutcome} />
    </div>
  );
}

function Ticket({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800/50">{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold text-pine' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}
