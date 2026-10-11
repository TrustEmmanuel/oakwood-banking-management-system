import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentStatus } from '../components/PaymentStatus';
import { receiptFromTransaction } from '../components/ReceiptView';
import { Badge, Button, Card, Field, PinDialog, Select, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { PROVIDERS } from '../data/catalog';
import { formatDay } from '../lib/dates';
import { downloadHtml, receiptDocument } from '../lib/documents';
import { quotePayment } from '../lib/ledger';
import { formatMoney, moneyLt } from '../lib/money';
import { countryName } from '../lib/validate';

const REGIONS = [
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'NG', label: 'Nigeria' },
];

export function Bills() {
  const bank = useBank();
  const navigate = useNavigate();
  const [region, setRegion] = useState('US');
  const [providerId, setProviderId] = useState('coned');
  const [accountId, setAccountId] = useState('usd');
  const [amount, setAmount] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [error, setError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [outcome, setOutcome] = useState(null);

  const providers = PROVIDERS.filter((item) => item.region === region);
  const provider = PROVIDERS.find((item) => item.id === providerId) || providers[0];
  const account = bank.accounts.find((item) => item.id === accountId);
  const history = bank.transactions.filter((tx) => tx.type === 'BILL').slice(0, 8);

  const quote = useMemo(() => {
    if (!provider || !account || !amount.trim()) return null;
    return quotePayment({
      fromCurrency: account.currency,
      toCurrency: provider.currency,
      paymentAmount: amount,
      waiveFee: true,
    });
  }, [provider, account, amount]);

  function chooseRegion(next) {
    setRegion(next);
    const first = PROVIDERS.find((item) => item.region === next);
    setProviderId(first.id);
    const funding = bank.accounts.find((item) => item.currency === first.currency);
    if (funding) setAccountId(funding.id);
  }

  function chooseProvider(id) {
    setProviderId(id);
    const next = PROVIDERS.find((item) => item.id === id);
    const funding = bank.accounts.find((item) => item.currency === next.currency);
    if (funding) setAccountId(funding.id);
  }

  function start() {
    if (!quote?.ok) {
      setError(quote?.error || 'Enter the amount due.');
      return;
    }
    if (customerReference.trim().length < 3) {
      setError('Enter the biller account or invoice reference.');
      return;
    }
    if (moneyLt(account.available, quote.totalDebit)) {
      setError(`Available balance in ${account.name} is ${formatMoney(account.available, account.currency)}.`);
      return;
    }
    setError('');
    setPinError('');
    setPinOpen(true);
  }

  function onPin(pin) {
    const result = bank.payBill({ providerId: provider.id, accountId, amount, customerReference, pin });
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
      setAmount('');
      setCustomerReference('');
    }
  }

  function downloadReceipt(tx) {
    const receipt = receiptFromTransaction(tx, bank.accounts);
    downloadHtml(`Oakwood-${receipt.reference}.html`, receiptDocument(receipt));
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Payables</p>
        <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Bill payments</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Corporate utilities and services in the United States, the United Kingdom, and Nigeria. Billers are simulated. The debit hits the selected Oakwood account immediately.</p>
      </header>

      <div className="flex gap-2">
        {REGIONS.map((item) => (
          <button key={item.id} type="button" onClick={() => chooseRegion(item.id)} className={`h-8 rounded-md px-3 text-xs font-medium ${region === item.id ? 'bg-pine text-white' : 'border border-emerald-200 bg-white text-pine'}`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <div className="border-b border-emerald-50 px-4 py-3 text-[13px] font-semibold text-pine">{countryName(region)} billers</div>
          <ul>
            {providers.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => chooseProvider(item.id)} className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-emerald-50/60 ${provider?.id === item.id ? 'bg-emerald-50' : ''}`}>
                  <span>
                    <span className="block text-sm font-medium text-ink">{item.name}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">{item.category} · {item.hint}</span>
                  </span>
                  <Badge>{item.currency}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/55">{provider?.category}</p>
          <h2 className="mt-1 text-sm font-semibold text-pine">{provider?.name}</h2>
          <div className="mt-4 space-y-3">
            <Field label="Funding account" hint={account ? `Available ${formatMoney(account.available, account.currency)}` : ''}>
              <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {bank.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label={`Amount due (${provider?.currency})`}>
              <TextInput inputMode="decimal" value={amount} placeholder="0.00" onChange={(event) => setAmount(event.target.value)} />
            </Field>
            <Field label="Biller reference" hint={provider?.hint}>
              <TextInput value={customerReference} onChange={(event) => setCustomerReference(event.target.value)} />
            </Field>
            {quote?.ok && (
              <p className="text-xs text-slate-600">
                Debit {formatMoney(quote.totalDebit, quote.debitCurrency)} from {account.name}. {quote.rateText}.
              </p>
            )}
            {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
            <Button onClick={start}>Pay bill</Button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-emerald-50 px-4 py-3 text-[13px] font-semibold text-pine">Recent bill payments</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Biller</th>
                <th className="px-3 py-2 font-semibold">Narrative</th>
                <th className="px-4 py-2 text-right font-semibold">Amount</th>
                <th className="px-4 py-2 text-right font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {history.map((tx) => (
                <tr key={tx.id} className="border-b border-emerald-50">
                  <td className="px-4 py-2.5 text-slate-500">{formatDay(tx.bookDate)}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">{tx.counterparty}</td>
                  <td className="px-3 py-2.5 text-slate-600">{tx.narrative}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(tx.amount, tx.currency, { signed: true })}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="secondary" size="sm" onClick={() => downloadReceipt(tx)}>Download receipt</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <PinDialog open={pinOpen} title="Authorize bill payment" detail={provider ? `${provider.name} · ${quote ? formatMoney(quote.totalDebit, account.currency) : ''}` : ''} error={pinError} onClose={() => setPinOpen(false)} onSubmit={onPin} />
      <PaymentStatus outcome={outcome} onDone={() => { setOutcome(null); navigate('/'); }} onDismiss={() => setOutcome(null)} onSettled={settleOutcome} />
    </div>
  );
}
