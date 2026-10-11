import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdviceModal, receiptFromTransaction } from '../components/ReceiptView';
import { Button, Card, MoneyText, StatusBadge } from '../components/ui';
import { useBank } from '../context/BankContext';
import { formatDay } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { countryName } from '../lib/validate';

export function AccountDetail() {
  const { accountId } = useParams();
  const { accounts, transactions } = useBank();
  const account = accounts.find((item) => item.id === accountId);
  const [copied, setCopied] = useState('');
  const [receipt, setReceipt] = useState(null);

  if (!account) {
    return (
      <div className="max-w-lg py-10">
        <h1 className="font-serif text-3xl text-pine">This account is not on the mandate.</h1>
        <Link to="/accounts" className="mt-4 inline-block text-sm text-pine hover:underline">Back to accounts</Link>
      </div>
    );
  }

  const rows = transactions.filter((tx) => tx.accountId === account.id).slice(0, 12);

  async function copy(value, key) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied(''), 1400);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">{countryName(account.region)} · {account.product}</p>
          <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">{account.name}</h1>
          <p className="mt-1 text-xs text-slate-500">{account.bank} · {account.address}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/transfers?from=${account.id}`}><Button>Transfer from this account</Button></Link>
          <Link to={`/statements?account=${account.id}`}><Button variant="secondary">Statement</Button></Link>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/55">Book balance</p>
          <p className="mt-2 font-serif text-[28px] text-pine tabular-nums">{formatMoney(account.balance, account.currency)}</p>
        </Card>
        <Card className="px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/55">Available</p>
          <p className="mt-2 font-serif text-[28px] text-pine tabular-nums">{formatMoney(account.available, account.currency)}</p>
        </Card>
        <Card className="px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/55">Hold</p>
          <p className="mt-2 font-serif text-[28px] text-pine tabular-nums">{formatMoney(account.hold, account.currency)}</p>
          <p className="mt-2 text-[11px] text-slate-500">Reserved amounts are unavailable for new instructions.</p>
        </Card>
      </div>

      <Card>
        <div className="border-b border-emerald-50 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-pine">Bank coordinates</h2>
          <p className="text-[11px] text-slate-500">Specimen identifiers for {account.office}.</p>
        </div>
        <dl className="grid gap-px bg-emerald-50 sm:grid-cols-2">
          {account.identifiers.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/50">{item.label}</dt>
                <dd className="mt-1 text-sm font-medium tabular-nums text-ink">{item.value}</dd>
              </div>
              <button type="button" onClick={() => copy(item.value, item.label)} className="text-[11px] font-medium text-pine hover:underline">
                {copied === item.label ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
          <div className="bg-white px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/50">SWIFT / BIC</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums text-ink">{account.swift}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-emerald-50 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-pine">Recent postings</h2>
          <Link to={`/statements?account=${account.id}`} className="text-xs font-medium text-pine hover:underline">Open statement</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Reference</th>
                <th className="px-3 py-2 font-semibold">Counterparty</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-b border-emerald-50">
                  <td className="px-4 py-2.5 text-slate-500">{formatDay(tx.bookDate)}</td>
                  <td className="px-3 py-2.5">
                    <button type="button" className="font-medium text-pine hover:underline" onClick={() => setReceipt(receiptFromTransaction(tx, accounts))}>{tx.reference}</button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>{tx.counterparty}</div>
                    <div className="text-[11px] text-slate-500">{tx.narrative}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right"><MoneyText amount={tx.amount} currency={tx.currency} signed /></td>
                  <td className="px-4 py-2.5"><StatusBadge status={tx.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <AdviceModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
