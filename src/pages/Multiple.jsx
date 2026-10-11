import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentStatus } from '../components/PaymentStatus';
import { Button, Card, Field, PinDialog, Select, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { COUNTRIES } from '../data/catalog';
import { assessBulk } from '../lib/ledger';
import { formatAmountFixed, formatAmountInput, formatMoney, parseAmount } from '../lib/money';
import { normalizeBeneficiary, validateBeneficiary } from '../lib/validate';

const PURPOSE = 'Multiple transfer';

const EMPTY_MANUAL = {
  name: '',
  country: 'US',
  currency: 'USD',
  bankName: '',
  bankCode: '',
  accountNumber: '',
  swift: '',
};

function lineKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function MultipleTransfer() {
  const bank = useBank();
  const navigate = useNavigate();
  const [draft, setDraft] = useState({
    option: '',
    beneficiaryId: '',
    accountId: '',
    narrative: '',
    amount: '',
    manual: EMPTY_MANUAL,
  });
  const [lines, setLines] = useState([]);
  const [formError, setFormError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [outcome, setOutcome] = useState(null);

  const beneficiary = bank.beneficiaries.find((item) => item.id === draft.beneficiaryId);
  const assessment = useMemo(
    () => (lines.length ? assessBulk(bank.snapshot, { purpose: PURPOSE, rows: lines }) : null),
    [bank.snapshot, lines],
  );

  function patch(partial) {
    setDraft((current) => ({ ...current, ...partial }));
    setFormError('');
  }

  function addBeneficiary() {
    if (draft.option !== 'saved' && draft.option !== 'new') {
      setFormError('Select saved or new beneficiary.');
      return;
    }
    if (draft.option === 'saved' && !draft.beneficiaryId) {
      setFormError('Select a saved beneficiary.');
      return;
    }
    let manual = null;
    if (draft.option === 'new') {
      const validation = validateBeneficiary({ ...draft.manual, type: 'Vendor' });
      if (validation) {
        setFormError(validation.replace('Enter a 9-digit ABA routing number.', 'Enter a 9-digit routing number.').replace('Enter the beneficiary legal name.', 'Enter the beneficiary account name.'));
        return;
      }
      manual = normalizeBeneficiary({ ...draft.manual, type: 'Vendor' });
    }
    if (!draft.accountId) {
      setFormError('Select a debit account.');
      return;
    }
    const amount = parseAmount(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a transfer amount.');
      return;
    }
    const narrative = draft.narrative.trim();
    if (narrative.length < 3) {
      setFormError('Enter a narration of at least 3 characters.');
      return;
    }
    if (narrative.length > 140) {
      setFormError('Keep the narration to 140 characters.');
      return;
    }
    if (lines.length >= 20) {
      setFormError('A multiple transfer is limited to 20 beneficiaries.');
      return;
    }
    setLines((current) => [...current, {
      key: lineKey(),
      beneficiaryId: draft.option === 'saved' ? draft.beneficiaryId : '',
      manual,
      accountId: draft.accountId,
      amount: formatAmountFixed(amount),
      narrative,
    }]);
    setDraft({
      option: '',
      beneficiaryId: '',
      accountId: draft.accountId,
      narrative: '',
      amount: '',
      manual: EMPTY_MANUAL,
    });
    setFormError('');
    setAttempted(false);
  }

  function authorize() {
    setAttempted(true);
    if (!lines.length) return;
    const next = assessBulk(bank.snapshot, { purpose: PURPOSE, rows: lines });
    if (!next.ok) return;
    setPinError('');
    setPinOpen(true);
  }

  function onPin(pin) {
    const result = bank.bulk({ purpose: PURPOSE, rows: lines, pin });
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
    });
    if (result.ok) {
      setLines([]);
      setAttempted(false);
    }
  }

  function settleOutcome() {
    setOutcome((current) => {
      if (!current || current.phase !== 'processing') return current;
      return { ...current, phase: current.receipt ? 'success' : 'failed' };
    });
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Payments</p>
        <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Multiple transfer</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Choose a saved beneficiary or enter a new one, then authorize the batch. Every line posts together, or not at all.</p>
      </header>

      <Card className="mx-auto max-w-xl space-y-3 p-4">
        <Field label="Select option">
          <Select value={draft.option} onChange={(event) => patch({ option: event.target.value, beneficiaryId: '', manual: EMPTY_MANUAL })}>
            <option value="">Select</option>
            <option value="saved">Saved beneficiary</option>
            <option value="new">New beneficiary</option>
          </Select>
        </Field>
        {draft.option === 'saved' && (
          <Field label="Saved beneficiary">
            <Select value={draft.beneficiaryId} onChange={(event) => patch({ beneficiaryId: event.target.value })}>
              <option value="">Select</option>
              {bank.beneficiaries.map((item) => (
                <option key={item.id} value={item.id}>{item.name} ({item.accountNumber})</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Debit account">
          <Select value={draft.accountId} onChange={(event) => patch({ accountId: event.target.value })}>
            <option value="">Select</option>
            {bank.accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </Select>
        </Field>
        {draft.option === 'new' && (
          <>
            <Field label="Country">
              <Select value={draft.manual.country} onChange={(event) => {
                const country = event.target.value;
                const currency = COUNTRIES.find((item) => item.code === country)?.currency || 'USD';
                patch({ manual: { ...draft.manual, country, currency, bankCode: '', swift: '' } });
              }}>
                {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="Currency">
              <Select value={draft.manual.currency} onChange={(event) => patch({ manual: { ...draft.manual, currency: event.target.value } })}>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="NGN">NGN</option>
              </Select>
            </Field>
          </>
        )}
        <Field label="Bank name">
          <TextInput
            value={draft.option === 'new' ? draft.manual.bankName : (beneficiary?.bankName || '')}
            readOnly={draft.option !== 'new'}
            placeholder="Bank name"
            onChange={(event) => patch({ manual: { ...draft.manual, bankName: event.target.value } })}
          />
        </Field>
        {draft.option === 'new' && draft.manual.country !== 'NG' && (
          <Field label={draft.manual.country === 'GB' ? 'Sort code' : 'Routing number'}>
            <TextInput value={draft.manual.bankCode} placeholder={draft.manual.country === 'GB' ? 'Sort code' : 'Routing number'} onChange={(event) => patch({ manual: { ...draft.manual, bankCode: event.target.value } })} />
          </Field>
        )}
        <Field label="Beneficiary account number">
          <TextInput
            value={draft.option === 'new' ? draft.manual.accountNumber : (beneficiary?.accountNumber || '')}
            readOnly={draft.option !== 'new'}
            placeholder="Beneficiary account number"
            onChange={(event) => patch({ manual: { ...draft.manual, accountNumber: event.target.value } })}
          />
        </Field>
        <Field label="Beneficiary account name">
          <TextInput
            value={draft.option === 'new' ? draft.manual.name : (beneficiary?.name || '')}
            readOnly={draft.option !== 'new'}
            placeholder="Beneficiary account name"
            onChange={(event) => patch({ manual: { ...draft.manual, name: event.target.value } })}
          />
        </Field>
        <Field label="Narration">
          <TextInput maxLength={140} value={draft.narrative} placeholder="Narration" onChange={(event) => patch({ narrative: event.target.value })} />
        </Field>
        <Field label="Transfer amount">
          <TextInput
            inputMode="decimal"
            value={draft.amount}
            placeholder="Transfer amount"
            onChange={(event) => patch({ amount: formatAmountInput(event.target.value) })}
            onBlur={(event) => patch({ amount: event.target.value ? formatAmountFixed(event.target.value) : '' })}
          />
        </Field>
        {formError && <p className="text-xs text-rose-700" role="alert">{formError}</p>}
        <Button onClick={addBeneficiary}>Add beneficiary</Button>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-pine">Added beneficiaries</h2>
        {!lines.length && <p className="mt-2 text-xs text-slate-500">Beneficiaries you add appear here.</p>}
        {lines.length > 0 && (
          <ul className="mt-3 divide-y divide-emerald-50">
            {lines.map((line) => {
              const payee = line.manual || bank.beneficiaries.find((item) => item.id === line.beneficiaryId);
              const account = bank.accounts.find((item) => item.id === line.accountId);
              return (
                <li key={line.key} className="flex flex-wrap items-start justify-between gap-3 py-3 text-xs">
                  <div>
                    <p className="font-medium text-pine">{payee?.name || 'Beneficiary'}</p>
                    <p className="mt-1 text-slate-500">{payee?.bankName} · {payee?.accountNumber}</p>
                    <p className="mt-1 text-slate-500">{account?.name} · {line.narrative}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="tabular-nums text-ink">{payee ? formatMoney(parseAmount(line.amount), payee.currency) : line.amount}</p>
                    <button type="button" className="text-[11px] font-medium text-rose-800 hover:underline" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {assessment?.ok && (
          <ul className="mt-3 space-y-1 border-t border-emerald-50 pt-3 text-xs">
            {Object.entries(assessment.totals || {}).map(([id, total]) => {
              const account = bank.accounts.find((item) => item.id === id);
              return <li key={id} className="flex justify-between tabular-nums"><span>{account?.name}</span><span>{formatMoney(total, account?.currency || 'USD')}</span></li>;
            })}
          </ul>
        )}
        {attempted && assessment && !assessment.ok && <p className="mt-3 text-xs text-rose-700" role="alert">{assessment.error}</p>}
        {attempted && !lines.length && <p className="mt-3 text-xs text-rose-700" role="alert">Add at least one beneficiary.</p>}
        <Button className="mt-4" onClick={authorize} disabled={!lines.length}>Authorize</Button>
      </Card>

      <PinDialog
        open={pinOpen}
        title="Authorize multiple transfer"
        detail={`${lines.length} ${lines.length === 1 ? 'beneficiary' : 'beneficiaries'}`}
        error={pinError}
        onClose={() => setPinOpen(false)}
        onSubmit={onPin}
      />
      <PaymentStatus
        outcome={outcome}
        onDone={() => { setOutcome(null); navigate('/'); }}
        onDismiss={() => setOutcome(null)}
        onSettled={settleOutcome}
      />
    </div>
  );
}
