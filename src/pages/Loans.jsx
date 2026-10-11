import { useMemo, useState } from 'react';
import { AdviceModal } from '../components/ReceiptView';
import { Button, Card, Field, PinDialog, Select, StatusBadge, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { formatDay } from '../lib/dates';
import { nextInstallment, schedule } from '../lib/ledger';
import { formatMoney, parseAmount, round2 } from '../lib/money';

export function Loans() {
  const bank = useBank();
  const [calc, setCalc] = useState({ amount: '500000', rate: '6.75', tenor: '36' });
  const [showAll, setShowAll] = useState(false);
  const [application, setApplication] = useState({
    type: 'Revolving credit',
    currency: 'USD',
    amount: '500000',
    tenorMonths: '36',
    purpose: '',
  });
  const [appError, setAppError] = useState('');
  const [drawAmount, setDrawAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [actionError, setActionError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pending, setPending] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const quoteRows = useMemo(() => {
    const amount = parseAmount(calc.amount);
    const rate = Number(calc.rate) / 100;
    const tenor = Number(calc.tenor);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(rate) || rate < 0 || !Number.isInteger(tenor) || tenor < 1 || tenor > 60) return [];
    return schedule(amount, rate, tenor);
  }, [calc]);
  const visibleRows = showAll ? quoteRows : quoteRows.slice(0, 6);
  const totalInterest = round2(quoteRows.reduce((sum, row) => sum + row.interest, 0));
  const totalPayable = round2(quoteRows.reduce((sum, row) => sum + row.payment, 0));

  function useQuote() {
    setApplication((current) => ({
      ...current,
      amount: calc.amount,
      tenorMonths: calc.tenor,
      currency: 'USD',
    }));
  }

  function submitApplication(event) {
    event.preventDefault();
    const result = bank.applyCredit({
      ...application,
      tenorMonths: Number(application.tenorMonths),
    });
    if (!result.ok) {
      setAppError(result.error);
      return;
    }
    setAppError('');
    setApplication((current) => ({ ...current, purpose: '' }));
  }

  function ask(action) {
    setActionError('');
    setPinError('');
    setPending(action);
    setPinOpen(true);
  }

  function onPin(pin) {
    let result;
    if (pending?.kind === 'draw') result = bank.drawFacility({ facilityId: 'revolver', amount: drawAmount, pin });
    else if (pending?.kind === 'repay') result = bank.repayFacility({ facilityId: 'revolver', amount: repayAmount, pin });
    else result = bank.repayFacility({ facilityId: 'term-gbp', pin });
    if (!result.ok) {
      setPinError(result.error);
      return;
    }
    setPinOpen(false);
    setReceipt(result.receipt);
    setDrawAmount('');
    setRepayAmount('');
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Financing</p>
        <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Credit facilities</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">A pre-approved revolving line and a sterling term loan. Draws and repayments post to the matching currency account on this specimen.</p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {bank.facilities.map((facility) => {
          const installment = nextInstallment(facility);
          const interest = round2(facility.drawn * facility.rate / 12);
          const headroom = round2(facility.limit - facility.drawn);
          return (
            <Card key={facility.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/55">{facility.shortName}</p>
                  <h2 className="mt-1 text-sm font-semibold text-pine">{facility.name}</h2>
                </div>
                <StatusBadge status={facility.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Stat label={facility.kind === 'revolver' ? 'Limit' : 'Original principal'} value={formatMoney(facility.limit, facility.currency)} />
                <Stat label="Outstanding" value={formatMoney(facility.drawn, facility.currency)} />
                <Stat label={facility.kind === 'revolver' ? 'Undrawn' : 'Remaining tenor'} value={facility.kind === 'revolver' ? formatMoney(headroom, facility.currency) : `${facility.remainingMonths} months`} />
                <Stat label="Rate" value={facility.allInLabel} />
                <Stat label="Maturity" value={formatDay(facility.maturity)} />
                <Stat label="Next due" value={formatDay(facility.nextPayment)} />
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{facility.covenants}</p>
              <p className="mt-1 text-[11px] text-emerald-800">Covenant status · {facility.covenantStatus}</p>
              {facility.kind === 'revolver' && (
                <p className="mt-2 text-xs text-ink">Indicative monthly interest on the drawn balance {formatMoney(interest, facility.currency)}.</p>
              )}
              {installment && (
                <p className="mt-2 text-xs text-ink">Next instalment {formatMoney(installment.payment, facility.currency)} · principal {formatMoney(installment.principal, facility.currency)} · interest {formatMoney(installment.interest, facility.currency)}.</p>
              )}
              <div className="mt-3 h-1.5 bg-emerald-50">
                <div className="h-1.5 bg-pine" style={{ width: `${Math.min(100, (facility.drawn / facility.limit) * 100)}%` }} />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-pine">Draw or repay</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Revolver movements credit or debit USD Checking. The term loan instalment debits the GBP treasury account.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Draw amount (USD)">
              <TextInput inputMode="decimal" value={drawAmount} onChange={(event) => setDrawAmount(event.target.value)} />
            </Field>
            <div className="self-end"><Button onClick={() => ask({ kind: 'draw' })}>Draw revolver</Button></div>
            <Field label="Repay principal (USD)">
              <TextInput inputMode="decimal" value={repayAmount} onChange={(event) => setRepayAmount(event.target.value)} />
            </Field>
            <div className="self-end"><Button variant="secondary" onClick={() => ask({ kind: 'repay' })}>Repay revolver</Button></div>
          </div>
          <Button className="mt-3" variant="secondary" onClick={() => ask({ kind: 'installment' })}>Pay sterling instalment</Button>
          {actionError && <p className="mt-3 text-xs text-rose-700">{actionError}</p>}
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-pine">Indicative calculator</h2>
              <p className="mt-1 text-[11px] text-slate-500">Level monthly payment. This quote does not reserve a limit.</p>
            </div>
            <Button variant="ghost" onClick={useQuote}>Use this quote</Button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Principal"><TextInput inputMode="decimal" value={calc.amount} onChange={(event) => setCalc({ ...calc, amount: event.target.value })} /></Field>
            <Field label="Annual rate %"><TextInput inputMode="decimal" value={calc.rate} onChange={(event) => setCalc({ ...calc, rate: event.target.value })} /></Field>
            <Field label="Tenor (months)"><TextInput inputMode="numeric" value={calc.tenor} onChange={(event) => setCalc({ ...calc, tenor: event.target.value })} /></Field>
          </div>
          {quoteRows.length > 0 && (
            <>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <Stat label="Monthly" value={formatMoney(quoteRows[0].payment, 'USD')} />
                <Stat label="Total interest" value={formatMoney(totalInterest, 'USD')} />
                <Stat label="Total payable" value={formatMoney(totalPayable, 'USD')} />
              </dl>
              <div className="mt-3 max-h-64 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.12em] text-emerald-800/50">
                      <th className="py-1.5 font-semibold">#</th>
                      <th className="py-1.5 text-right font-semibold">Payment</th>
                      <th className="py-1.5 text-right font-semibold">Interest</th>
                      <th className="py-1.5 text-right font-semibold">Principal</th>
                      <th className="py-1.5 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.index} className="border-b border-emerald-50 tabular-nums">
                        <td className="py-1.5">{row.index}</td>
                        <td className="py-1.5 text-right">{formatMoney(row.payment, 'USD')}</td>
                        <td className="py-1.5 text-right">{formatMoney(row.interest, 'USD')}</td>
                        <td className="py-1.5 text-right">{formatMoney(row.principal, 'USD')}</td>
                        <td className="py-1.5 text-right">{formatMoney(row.balance, 'USD')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {quoteRows.length > 6 && (
                <button type="button" className="mt-2 text-xs font-medium text-pine hover:underline" onClick={() => setShowAll((value) => !value)}>
                  {showAll ? 'Show first six periods' : `Show full ${quoteRows.length}-month schedule`}
                </button>
              )}
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-pine">Request a facility</h2>
          <form className="mt-3 space-y-3" onSubmit={submitApplication}>
            <Field label="Type">
              <Select value={application.type} onChange={(event) => setApplication({ ...application, type: event.target.value })}>
                <option>Revolving credit</option>
                <option>Term loan</option>
                <option>Revolver increase</option>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Currency">
                <Select value={application.currency} onChange={(event) => setApplication({ ...application, currency: event.target.value })}>
                  <option>USD</option><option>GBP</option><option>NGN</option>
                </Select>
              </Field>
              <Field label="Amount">
                <TextInput inputMode="decimal" value={application.amount} onChange={(event) => setApplication({ ...application, amount: event.target.value })} />
              </Field>
            </div>
            <Field label="Tenor (months)">
              <TextInput inputMode="numeric" value={application.tenorMonths} onChange={(event) => setApplication({ ...application, tenorMonths: event.target.value })} />
            </Field>
            <Field label="Use of proceeds">
              <TextInput value={application.purpose} onChange={(event) => setApplication({ ...application, purpose: event.target.value })} />
            </Field>
            {appError && <p className="text-xs text-rose-700">{appError}</p>}
            <Button type="submit">Submit request</Button>
          </form>
        </Card>
        <Card>
          <div className="border-b border-emerald-50 px-4 py-3 text-[13px] font-semibold text-pine">Requests</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.12em] text-emerald-800/50">
                  <th className="px-4 py-2 font-semibold">Reference</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="px-3 py-2 font-semibold">Tenor</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {bank.applications.map((item) => (
                  <tr key={item.id} className="border-b border-emerald-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-pine">{item.reference}</div>
                      <div className="text-[11px] text-slate-500">{item.purpose}</div>
                    </td>
                    <td className="px-3 py-2.5">{item.type}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(item.amount, item.currency)}</td>
                    <td className="px-3 py-2.5">{item.tenorMonths} mo</td>
                    <td className="px-4 py-2.5"><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <PinDialog
        open={pinOpen}
        title="Authorize facility movement"
        detail={pending?.kind === 'installment' ? 'Sterling term loan instalment' : 'Revolving credit facility'}
        error={pinError}
        onClose={() => setPinOpen(false)}
        onSubmit={onPin}
      />
      <AdviceModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800/50">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink tabular-nums">{value}</dd>
    </div>
  );
}
