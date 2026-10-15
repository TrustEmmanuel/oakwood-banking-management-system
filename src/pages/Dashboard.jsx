import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Layers, ListPlus, ReceiptText, ScrollText } from 'lucide-react';
import { AdviceModal, receiptFromTransaction } from '../components/ReceiptView';
import { Badge, Card, MoneyText, SectionTitle, StatusBadge } from '../components/ui';
import { useBank } from '../context/BankContext';
import { formatClock, formatDay } from '../lib/dates';
import { nextInstallment } from '../lib/ledger';
import { cashflowSeries, convert, formatMoney, monthKey, round2 } from '../lib/money';

const ACTIONS = [
  { to: '/transfers', label: 'Single transfer', icon: ArrowLeftRight },
  { to: '/multiple', label: 'Multiple transfer', icon: ListPlus },
  { to: '/bulk', label: 'Bulk payment', icon: Layers },
  { to: '/bills', label: 'Pay bills', icon: ReceiptText },
  { to: '/statements', label: 'Print statement', icon: ScrollText },
];

function greeting(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const bank = useBank();
  const [now, setNow] = useState(() => new Date());
  const [receipt, setReceipt] = useState(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const month = monthKey(0, now);
  const monthName = now.toLocaleDateString('en-GB', { month: 'long' });
  const series = cashflowSeries(bank.transactions, now);
  const recent = [...bank.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const revolver = bank.facilities.find((facility) => facility.kind === 'revolver');
  const headroom = revolver ? revolver.limit - revolver.drawn : 0;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Oakwood Finance plc · Global treasury</p>
          <h1 className="mt-1 font-serif text-[30px] font-medium tracking-tight text-pine">{greeting(now)}, {bank.profile.name.split(' ')[0]}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {bank.profile.title} · {bank.profile.mandate} · Signed in {formatDay(bank.session.at)} {formatClock(bank.session.at)}
          </p>
        </div>
        <p className="max-w-sm text-right text-[11px] leading-relaxed text-slate-500">
          Consolidated figures use the Oakwood board rate. Settlement of new instructions uses the same rate.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {bank.accounts.map((account) => {
          const activity = bank.transactions
            .filter((tx) => tx.accountId === account.id && tx.bookDate.startsWith(month))
            .reduce((sum, tx) => sum + tx.amount, 0);
          const share = bank.navUsd ? (convert(account.balance, account.currency, 'USD') / bank.navUsd) * 100 : 0;
          return (
            <Link key={account.id} to={`/accounts/${account.id}`} className="block">
              <Card className="relative h-full transition-colors hover:border-emerald-300">
                <span className="pointer-events-none absolute right-2.5 top-1.5 font-serif text-2xl text-pine/[0.06]">{account.currency}</span>
                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/55">{account.name}</p>
                    <Badge>{account.currency}</Badge>
                  </div>
                  <p className="mt-1 font-serif text-[18px] leading-none font-medium tracking-tight text-pine tabular-nums">{formatMoney(account.balance, account.currency)}</p>
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    Available {formatMoney(account.available, account.currency)}
                    <span className="text-slate-300"> · </span>
                    Hold {formatMoney(account.hold, account.currency)}
                  </p>
                  <p className="mt-0.5 text-[10px]">
                    <MoneyText amount={activity} currency={account.currency} signed />
                    <span className="text-slate-500"> {monthName} activity</span>
                  </p>
                  <div className="mt-1.5 h-0.5 bg-emerald-50">
                    <div className="h-0.5 bg-emerald-700" style={{ width: `${Math.max(2, Math.min(100, share))}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">{share.toFixed(1)}% of consolidated</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {ACTIONS.map((action) => (
          <Link key={action.to} to={action.to} className="flex items-center gap-2.5 rounded-md border border-emerald-100 bg-white px-3 py-2.5 text-[13px] font-medium text-pine shadow-[0_10px_30px_-24px_rgba(6,78,59,0.8)] hover:border-emerald-300 hover:bg-emerald-50/50">
            <action.icon size={15} strokeWidth={1.75} />
            {action.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <SectionTitle
            eyebrow="Ledger"
            title="Recent multi-currency activity"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Reference</th>
                  <th className="px-3 py-2 font-semibold">Counterparty</th>
                  <th className="px-3 py-2 font-semibold">Corridor</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((tx) => (
                  <tr key={tx.id} className="border-b border-emerald-50 text-xs hover:bg-emerald-50/50">
                    <td className="px-4 py-2.5 text-slate-500">{formatDay(tx.bookDate)}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" className="font-medium text-pine hover:underline" onClick={() => setReceipt(receiptFromTransaction(tx, bank.accounts))}>{tx.reference}</button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-ink">{tx.counterparty}</div>
                      <div className="text-[11px] text-slate-500">{tx.narrative}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{tx.corridor}</td>
                    <td className="px-3 py-2.5 text-right"><MoneyText amount={tx.amount} currency={tx.currency} signed /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={tx.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <SectionTitle eyebrow="Liquidity" title="Cash flow, USD equivalent" />
            <div className="px-4 pb-4">
              <Cashflow series={series} />
              <p className="mt-2 text-[11px] text-slate-500">Inflows and outflows converted at the board rate. Last six months.</p>
            </div>
          </Card>
          <Card>
            <SectionTitle eyebrow="Credit" title="Revolving headroom" action={<Link to="/credit" className="text-xs font-medium text-pine hover:underline">Facilities</Link>} />
            <div className="px-4 pb-4">
              <p className="font-serif text-2xl text-pine tabular-nums">{formatMoney(headroom, 'USD')}</p>
              <p className="mt-1 text-[11px] text-slate-500">Undrawn of {formatMoney(revolver.limit, 'USD')} · {revolver.rateLabel}</p>
              <div className="mt-3 h-1.5 bg-emerald-50">
                <div className="h-1.5 bg-pine" style={{ width: `${(revolver.drawn / revolver.limit) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">Drawn {formatMoney(revolver.drawn, 'USD')}</p>
              <ul className="mt-3 space-y-2 border-t border-emerald-50 pt-3">
                {bank.facilities.filter((facility) => facility.status === 'Active').map((facility) => {
                  const amount = facility.kind === 'term'
                    ? nextInstallment(facility)?.payment
                    : round2(facility.drawn * facility.rate / 12);
                  return (
                    <li key={facility.id} className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="text-slate-600">{facility.shortName} · {formatDay(facility.nextPayment)}</span>
                      <span className="tabular-nums text-ink">{formatMoney(amount || 0, facility.currency)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </div>
      </div>
      <AdviceModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function Cashflow({ series }) {
  const max = Math.max(...series.flatMap((item) => [item.inflow, item.outflow]), 1);
  return (
    <div>
      <svg viewBox="0 0 360 150" className="h-40 w-full" role="img" aria-label="Six month cash flow in USD">
        {series.map((item, index) => {
          const group = 16 + index * 58;
          const inH = (item.inflow / max) * 96;
          const outH = (item.outflow / max) * 96;
          return (
            <g key={item.key}>
              <rect x={group} y={112 - inH} width="16" height={inH} fill="#059669" rx="1">
                <title>{`${item.label} inflow ${formatMoney(item.inflow, 'USD')}`}</title>
              </rect>
              <rect x={group + 20} y={112 - outH} width="16" height={outH} fill="#94a3b8" rx="1">
                <title>{`${item.label} outflow ${formatMoney(item.outflow, 'USD')}`}</title>
              </rect>
              <text x={group + 18} y="132" textAnchor="middle" fontSize="10" fill="#64748b">{item.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-[10px] uppercase tracking-[0.12em] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 bg-emerald-600" /> Inflow</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 bg-slate-400" /> Outflow</span>
      </div>
      <table className="sr-only">
        <tbody>
          {series.map((item) => (
            <tr key={item.key}>
              <td>{item.label}</td>
              <td>{formatMoney(item.inflow, 'USD')}</td>
              <td>{formatMoney(item.outflow, 'USD')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
