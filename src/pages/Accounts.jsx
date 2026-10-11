import { Link } from 'react-router-dom';
import { Card, MoneyText } from '../components/ui';
import { useBank } from '../context/BankContext';
import { formatMoney } from '../lib/money';
import { countryName } from '../lib/validate';

export function Accounts() {
  const { accounts } = useBank();
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Posting accounts</p>
        <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Accounts on this mandate</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Three booking centres. Coordinates below are specimen values for the demonstration and are safe to copy into a transfer narrative.</p>
      </header>
      <div className="grid gap-3 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id} className="flex flex-col">
            <div className="border-b border-emerald-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-pine">{account.name}</h2>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/60">{account.currency}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">{account.product} · {countryName(account.region)}</p>
            </div>
            <div className="px-4 py-4">
              <p className="font-serif text-[26px] leading-none text-pine tabular-nums">{formatMoney(account.balance, account.currency)}</p>
              <p className="mt-2 text-[11px] text-slate-500">Available {formatMoney(account.available, account.currency)}</p>
              <dl className="mt-4 space-y-1.5 text-xs">
                {account.identifiers.slice(0, 3).map((item) => (
                  <div key={item.label} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{item.label}</dt>
                    <dd className="font-medium text-ink tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="mt-auto flex gap-2 border-t border-emerald-50 px-4 py-3">
              <Link to={`/accounts/${account.id}`} className="text-xs font-medium text-pine hover:underline">View account</Link>
              <Link to={`/transfers?from=${account.id}`} className="text-xs font-medium text-pine hover:underline">Transfer</Link>
              <Link to={`/statements?account=${account.id}`} className="text-xs font-medium text-pine hover:underline">Statement</Link>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                <th className="px-4 py-2 font-semibold">Account</th>
                <th className="px-3 py-2 font-semibold">Bank</th>
                <th className="px-3 py-2 font-semibold">SWIFT</th>
                <th className="px-3 py-2 text-right font-semibold">Book balance</th>
                <th className="px-3 py-2 text-right font-semibold">Available</th>
                <th className="px-4 py-2 text-right font-semibold">Hold</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-emerald-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/accounts/${account.id}`} className="font-medium text-pine hover:underline">{account.name}</Link>
                    <div className="text-[11px] text-slate-500">{account.office}</div>
                  </td>
                  <td className="px-3 py-2.5 text-ink">{account.bank}</td>
                  <td className="px-3 py-2.5 tabular-nums">{account.swift}</td>
                  <td className="px-3 py-2.5 text-right"><MoneyText amount={account.balance} currency={account.currency} /></td>
                  <td className="px-3 py-2.5 text-right"><MoneyText amount={account.available} currency={account.currency} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatMoney(account.hold, account.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
