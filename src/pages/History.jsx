import { useEffect, useMemo, useState } from 'react';
import { receiptFromTransaction } from '../components/ReceiptView';
import { Button, Card, Field, MoneyText, Select, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { typeLabel } from '../data/catalog';
import { formatDay, isoDate, todayISO } from '../lib/dates';
import { downloadHtml, receiptDocument } from '../lib/documents';

export function History() {
  const bank = useBank();
  const [from, setFrom] = useState(isoDate(0, 1));
  const [to, setTo] = useState(todayISO());
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bank.transactions
      .filter((tx) => {
        if (tx.bookDate < from || tx.bookDate > to) return false;
        if (!needle) return true;
        return `${tx.counterparty} ${tx.narrative} ${tx.reference}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [bank.transactions, from, to, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = rows.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, from, to, pageSize]);

  function downloadReceipt(tx) {
    const receipt = receiptFromTransaction(tx, bank.accounts);
    if (receipt.status === 'Settled') receipt.status = 'Successful';
    downloadHtml(`Oakwood-${receipt.reference}.html`, receiptDocument(receipt));
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Payments</p>
        <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Transaction history</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Download a receipt for any posted payment.</p>
      </header>

      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Field label="From"><TextInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
        <Field label="To"><TextInput type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
        <Field label="Search">
          <TextInput value={query} placeholder="Name or reference" onChange={(event) => setQuery(event.target.value)} />
        </Field>
      </Card>

      <Card>
        <div className="border-b border-emerald-50 px-4 py-3 text-[13px] font-semibold text-pine">{rows.length} payments</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Reference</th>
                <th className="px-3 py-2 font-semibold">Beneficiary</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-4 py-2 text-right font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No payments match this filter.</td></tr>
              )}
              {visibleRows.map((tx) => (
                <tr key={tx.id} className="border-b border-emerald-50">
                  <td className="px-4 py-2.5 text-slate-500">{formatDay(tx.bookDate)}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">{tx.reference}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-ink">{tx.counterparty}</div>
                    <div className="text-[11px] text-slate-500">{tx.narrative}</div>
                  </td>
                  <td className="px-3 py-2.5">{typeLabel(tx.type)}</td>
                  <td className="px-3 py-2.5 text-right"><MoneyText amount={tx.amount} currency={tx.currency} signed /></td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="secondary" size="sm" onClick={() => downloadReceipt(tx)}>Download receipt</Button>
                  </td>
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
            <p className="text-xs text-slate-500">{rows.length === 0 ? '0 payments' : `${pageStart + 1}–${Math.min(pageStart + pageSize, rows.length)} of ${rows.length}`}</p>
            <Button variant="secondary" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
