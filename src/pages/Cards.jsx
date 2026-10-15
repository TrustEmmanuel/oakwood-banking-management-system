import { useState } from 'react';
import { PaymentStatus } from '../components/PaymentStatus';
import { Button, Card, Field, PinDialog, StatusBadge, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { CARD_FEE } from '../lib/ledger';
import { formatDay } from '../lib/dates';
import { formatMoney, moneyLt } from '../lib/money';

const CURRENCIES = ['USD', 'GBP', 'NGN'];

export function Cards() {
  const bank = useBank();
  const [currency, setCurrency] = useState('USD');
  const [nameOnCard, setNameOnCard] = useState(bank.profile?.name || '');
  const [delivery, setDelivery] = useState('address');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [outcome, setOutcome] = useState(null);

  const fee = CARD_FEE[currency];
  const account = bank.accounts.find((item) => item.currency === currency);
  const cards = bank.cards || [];

  function start() {
    const name = nameOnCard.trim();
    if (name.length < 2) {
      setError('Enter the name on the card.');
      return;
    }
    if (!account) {
      setError(`There is no ${currency} operating account to charge.`);
      return;
    }
    if (moneyLt(account.available, fee)) {
      setError(`Available balance in ${account.name} is ${formatMoney(account.available, account.currency)}. The debit card fee is ${formatMoney(fee, currency)}.`);
      return;
    }
    if (delivery === 'address' && address.trim().length < 8) {
      setError('Enter the address the card should be sent to.');
      return;
    }
    setError('');
    setPinError('');
    setPinOpen(true);
  }

  function onPin(pin) {
    const result = bank.requestCard({ currency, nameOnCard, pin, delivery, address });
    if (!result.ok && /pin/i.test(result.error)) {
      setPinError(result.error);
      return;
    }
    setPinOpen(false);
    setPinError('');
    setOutcome({
      phase: 'processing',
      kind: 'card',
      deliveryAddress: result.card?.deliveryAddress || '',
      receipt: result.ok ? result.receipt : null,
      error: result.ok ? '' : result.error,
    });
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Services</p>
        <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Cards</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Request a debit card on an Oakwood operating account. The issuance fee is debited immediately: $3, £3, or ₦1,500.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="space-y-4 p-4">
            <div>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">Currency</span>
              <div className="grid grid-cols-3 gap-2">
                {CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`rounded-md border px-3 py-2 text-left ${currency === code ? 'border-pine bg-mint' : 'border-emerald-100 bg-white hover:bg-emerald-50'}`}
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/60">{code}</span>
                    <span className="mt-1 block text-sm font-medium text-pine">{formatMoney(CARD_FEE[code], code)}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Name on card" hint="Printed on the debit card. Up to 26 characters.">
              <TextInput value={nameOnCard} maxLength={26} onChange={(event) => setNameOnCard(event.target.value)} />
            </Field>
            <div>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">Where to send the card</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { setDelivery('address'); setError(''); }}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${delivery === 'address' ? 'border-pine bg-mint text-pine' : 'border-emerald-100 bg-white text-ink hover:bg-emerald-50'}`}
                >
                  Send to an address
                </button>
                <button
                  type="button"
                  onClick={() => { setDelivery('branch'); setError(''); }}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${delivery === 'branch' ? 'border-pine bg-mint text-pine' : 'border-emerald-100 bg-white text-ink hover:bg-emerald-50'}`}
                >
                  Head office branch
                </button>
              </div>
              {delivery === 'address' ? (
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">Delivery address</span>
                  <textarea
                    value={address}
                    rows={3}
                    maxLength={160}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Street, city, and country"
                    className="w-full rounded-md border border-emerald-200 bg-white px-2.5 py-2 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-pine focus:ring-2 focus:ring-emerald-800/10"
                  />
                </label>
              ) : (
                <p className="mt-3 rounded-md border border-emerald-100 bg-mint px-3 py-2 text-xs leading-relaxed text-pine">
                  Held for collection at the head office.{account ? ` ${account.bank}, ${account.address}.` : ''}
                </p>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {account
                ? `The fee of ${formatMoney(fee, currency)} is debited from ${account.name}. Available ${formatMoney(account.available, account.currency)}.`
                : `No ${currency} account is open.`}
            </p>
            {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
            <Button onClick={start}>Request debit card</Button>
          </div>
        </Card>

        <Card>
          <div className="border-b border-emerald-50 px-4 py-3 text-[13px] font-semibold text-pine">Issuance fees</div>
          <dl className="divide-y divide-emerald-50 text-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-slate-600">US dollar debit card</dt>
              <dd className="font-medium tabular-nums text-pine">{formatMoney(3, 'USD')}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-slate-600">Sterling debit card</dt>
              <dd className="font-medium tabular-nums text-pine">{formatMoney(3, 'GBP')}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-slate-600">Naira debit card</dt>
              <dd className="font-medium tabular-nums text-pine">{formatMoney(1500, 'NGN')}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <div className="border-b border-emerald-50 px-4 py-3 text-[13px] font-semibold text-pine">Issued cards</div>
        {cards.length === 0 ? (
          <p className="px-4 py-6 text-xs text-slate-500">No debit cards have been requested in this specimen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                  <th className="px-4 py-2 font-semibold">Issued</th>
                  <th className="px-3 py-2 font-semibold">Card</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Account</th>
                  <th className="px-3 py-2 font-semibold">Sent to</th>
                  <th className="px-3 py-2 text-right font-semibold">Fee</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.id} className="border-b border-emerald-50">
                    <td className="px-4 py-2.5 text-slate-500">{formatDay(card.issuedAt.slice(0, 10))}</td>
                    <td className="px-3 py-2.5 font-medium text-ink">Debit · {card.currency} · •••• {card.last4}</td>
                    <td className="px-3 py-2.5 text-slate-600">{card.nameOnCard}</td>
                    <td className="px-3 py-2.5 text-slate-600">{card.accountName}</td>
                    <td className="max-w-[220px] px-3 py-2.5 text-slate-600">{card.delivery === 'branch' ? `Head office · ${card.deliveryAddress}` : card.deliveryAddress}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(card.fee, card.currency)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={card.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PinDialog
        open={pinOpen}
        title="Authorize debit card"
        detail={`${currency} debit card · ${formatMoney(fee, currency)}`}
        error={pinError}
        onClose={() => setPinOpen(false)}
        onSubmit={onPin}
      />
      <PaymentStatus outcome={outcome} onDone={() => setOutcome(null)} onDismiss={() => setOutcome(null)} onSettled={settleOutcome} />
    </div>
  );
}
