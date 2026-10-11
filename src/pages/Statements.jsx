import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdviceModal, receiptFromTransaction } from '../components/ReceiptView';
import { Button, Card, Field, MoneyText, Select, StatusBadge, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { TX_TYPES, typeLabel } from '../data/catalog';
import { isoDate, todayISO, formatDay } from '../lib/dates';
import { downloadCsv, printHtml, statementDocument } from '../lib/documents';
import { round2 } from '../lib/money';

export function Statements() {
  const bank = useBank();
  const [params] = useSearchParams();
  const [accountId, setAccountId] = useState(params.get('account') || 'ALL');
  const [currency, setCurrency] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [from, setFrom] = useState(isoDate(0, 1));
  const [to, setTo] = useState(todayISO());
  const [query, setQuery] = useState(params.get('q') || '');
  const [receipt, setReceipt] = useState(null);
  const [printError, setPrintError] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => bank.transactions.filter((tx) => {
    if (accountId !== 'ALL' && tx.accountId !== accountId) return false;
    if (currency !== 'ALL' && tx.currency !== currency) return false;
    if (type !== 'ALL' && tx.type !== type) return false;
    if (tx.bookDate < from || tx.bookDate > to) return false;
    const haystack = `${tx.counterparty} ${tx.narrative} ${tx.reference}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date)), [bank.transactions, accountId, currency, type, from, to, query]);

  const totals = ['USD', 'GBP', 'NGN'].map((code) => {
    const mine = rows.filter((tx) => tx.currency === code);
    const credits = round2(mine.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0));
    const debits = round2(mine.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0));
    return { currency: code, credits, debits, net: round2(credits - debits) };
  }).filter((item) => item.credits || item.debits);

  const positions = bank.accounts
    .filter((account) => accountId === 'ALL' || account.id === accountId)
    .filter((account) => currency === 'ALL' || account.currency === currency)
    .map((account) => {
      const mine = bank.transactions.filter((tx) => tx.accountId === account.id);
      const after = mine.filter((tx) => tx.bookDate > to).reduce((sum, tx) => sum + tx.amount, 0);
      const closing = round2(account.balance - after);
      const movement = mine.filter((tx) => tx.bookDate >= from && tx.bookDate <= to).reduce((sum, tx) => sum + tx.amount, 0);
      return { account: account.name, currency: account.currency, opening: round2(closing - movement), closing };
    });

  const filterLabel = `${formatDay(from)} to ${formatDay(to)} · ${accountId === 'ALL' ? 'All accounts' : bank.accounts.find((item) => item.id === accountId)?.name} · ${currency === 'ALL' ? 'All currencies' : currency} · ${type === 'ALL' ? 'All types' : typeLabel(type)}`;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = rows.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [accountId, currency, type, from, to, query, pageSize]);

  function postingStatus(status) {
    return status === 'Settled' ? 'Successful' : status;
  }

  function statementHtml() {
    return statementDocument({
      entity: 'Oakwood Finance plc',
      filters: filterLabel,
      rows: rows.map((tx) => ({ ...tx, status: postingStatus(tx.status) })),
      totals,
      opening: positions,
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Reporting</p>
          <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Statements</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Opening and closing balances are derived from the current book and the postings inside the selected dates.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => {
            downloadCsv(`Oakwood-statement-${from}-${to}.csv`, rows.map((tx) => {
              const account = bank.accounts.find((item) => item.id === tx.accountId);
              return [tx.bookDate, tx.reference, account?.name, tx.counterparty, tx.narrative, typeLabel(tx.type), tx.corridor, tx.currency, tx.amount.toFixed(2), postingStatus(tx.status)];
            }));
            bank.record('Statement exported', filterLabel);
          }}>Download CSV</Button>
          <Button onClick={() => {
            const opened = printHtml('Oakwood statement', statementHtml());
            setPrintError(opened ? '' : 'Allow pop-up windows to print this statement.');
            if (opened) bank.record('Statement printed', filterLabel);
          }}>Print statement</Button>
        </div>
      </header>

      <Card className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
        <Field label="From"><TextInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
        <Field label="To"><TextInput type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
        <Field label="Account">
          <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="ALL">All accounts</option>
            {bank.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </Select>
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            <option value="ALL">All</option>
            <option>USD</option><option>GBP</option><option>NGN</option>
          </Select>
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="ALL">All types</option>
            {TX_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
        </Field>
        <Field label="Search">
          <TextInput value={query} placeholder="Name or reference" onChange={(event) => setQuery(event.target.value)} />
        </Field>
      </Card>

      {printError && <p className="text-xs text-rose-700">{printError}</p>}

      <div className="grid gap-3 md:grid-cols-3">
        {positions.map((position) => (
          <Card key={position.account} className="px-4 py-3">
            <p className="text-[11px] font-medium text-pine">{position.account}</p>
            <p className="mt-2 text-[11px] text-slate-500">Opening <MoneyText amount={position.opening} currency={position.currency} /></p>
            <p className="text-[11px] text-slate-500">Closing <MoneyText amount={position.closing} currency={position.currency} /></p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-emerald-50 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-pine">{rows.length} postings</h2>
          <p className="text-[11px] text-slate-500">{filterLabel}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Reference</th>
                <th className="px-3 py-2 font-semibold">Beneficiary</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Payment type</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No entries match this filter.</td></tr>}
              {visibleRows.map((tx) => (
                <tr key={tx.id} className="border-b border-emerald-50">
                  <td className="px-4 py-2.5 text-slate-500">{formatDay(tx.bookDate)}</td>
                  <td className="px-3 py-2.5">
                    <button type="button" className="font-medium text-pine hover:underline" onClick={() => setReceipt(receiptFromTransaction(tx, bank.accounts))}>{tx.reference}</button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-ink">{tx.counterparty}</div>
                    <div className="text-[11px] text-slate-500">{tx.narrative}</div>
                  </td>
                  <td className="px-3 py-2.5">{typeLabel(tx.type)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{tx.corridor}</td>
                  <td className="px-3 py-2.5 text-right"><MoneyText amount={tx.amount} currency={tx.currency} signed /></td>
                  <td className="px-4 py-2.5"><StatusBadge status={postingStatus(tx.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-50 px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Rows
            <Select className="w-20" value={String(pageSize)} onChange={(event) => setPageSize(Number(event.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </Select>
          </label>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">{rows.length === 0 ? '0 postings' : `${pageStart + 1}–${Math.min(pageStart + pageSize, rows.length)} of ${rows.length}`}</p>
            <Button variant="secondary" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}>Next</Button>
          </div>
        </div>
      </Card>
      <AdviceModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
