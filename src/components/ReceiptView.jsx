import { formatDay, formatDateTime } from '../lib/dates';
import { downloadHtml, printHtml, receiptDocument } from '../lib/documents';
import { formatMoney } from '../lib/money';
import { purposeLabel, typeLabel } from '../data/catalog';
import { Button, StatusBadge } from './ui';
import { useState } from 'react';

export function receiptFromTransaction(tx, accounts) {
  const account = accounts.find((item) => item.id === tx.accountId);
  const meta = tx.meta || {};
  const absolute = Math.abs(tx.amount);
  return {
    title: tx.amount < 0 ? 'Debit advice' : 'Credit advice',
    reference: tx.reference,
    createdAt: tx.date,
    bookDate: tx.bookDate,
    status: tx.status,
    accountName: account?.name || tx.accountId,
    bank: account?.bank || 'Oakwood Finance',
    counterparty: tx.counterparty,
    counterpartyDetail: meta.counterpartyDetail || tx.narrative,
    narrative: tx.narrative,
    corridor: tx.corridor,
    purpose: meta.purpose ? purposeLabel(meta.purpose) : typeLabel(tx.type),
    valueDate: meta.valueDate || tx.bookDate,
    quote: {
      paymentAmount: meta.paymentAmount ?? absolute,
      paymentCurrency: meta.paymentCurrency || tx.currency,
      fee: meta.fee || 0,
      feeCurrency: meta.feeCurrency || tx.currency,
      feeLabel: meta.feeLabel || 'Cable charge',
      totalDebit: absolute,
      debitCurrency: tx.currency,
      beneficiaryCredit: meta.beneficiaryCredit ?? absolute,
      rateText: meta.rateText || 'Posted amount on the specimen ledger',
      chargeBearer: meta.chargeBearer || 'SHA',
    },
    lines: null,
  };
}

export function ReceiptView({ receipt }) {
  const quote = receipt.quote;
  return (
    <article className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="-rotate-[18deg] select-none text-[58px] font-semibold tracking-[0.28em] text-pine/[0.05]">SPECIMEN</span>
      </div>
      <div className="relative">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-pine">OAKWOOD FINANCE</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h3 className="font-serif text-[26px] font-medium tracking-tight text-pine">{receipt.title}</h3>
          <StatusBadge status={receipt.status} />
        </div>
        <p className="mt-1 text-xs text-slate-500">{receipt.reference} · {formatDateTime(receipt.createdAt)}</p>
        <div className="mt-5 grid gap-4 border-y border-emerald-100 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/50">From</p>
            <p className="mt-1 text-sm font-medium text-pine">{receipt.accountName}</p>
            <p className="text-xs text-slate-500">{receipt.bank}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/50">To</p>
            <p className="mt-1 text-sm font-medium text-pine">{receipt.counterparty}</p>
            <p className="text-xs text-slate-500">{receipt.counterpartyDetail}</p>
          </div>
        </div>
        {quote && (
          <dl className="mt-2 divide-y divide-emerald-50 text-xs">
            <Row label="Payment amount" value={formatMoney(quote.paymentAmount, quote.paymentCurrency)} />
            <Row label="Rate" value={quote.rateText} />
            <Row label={quote.feeLabel || 'Cable charge'} value={formatMoney(quote.fee || 0, quote.feeCurrency || quote.debitCurrency)} />
            <Row label={receipt.title === 'Credit draw advice' ? 'Amount credited' : 'Amount posted'} value={formatMoney(quote.totalDebit, quote.debitCurrency)} />
            <Row label="Counterparty receives" value={formatMoney(quote.beneficiaryCredit, quote.paymentCurrency)} />
          </dl>
        )}
        {receipt.lines && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                  <th className="py-2 font-semibold">Reference</th>
                  <th className="py-2 font-semibold">Beneficiary</th>
                  <th className="py-2 font-semibold">Account</th>
                  <th className="py-2 text-right font-semibold">Payment</th>
                  <th className="py-2 text-right font-semibold">Debit</th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines.map((line) => (
                  <tr key={line.reference} className="border-b border-emerald-50">
                    <td className="py-2">{line.reference}</td>
                    <td className="py-2">{line.counterparty}</td>
                    <td className="py-2">{line.account}</td>
                    <td className="py-2 text-right tabular-nums">{line.payment}</td>
                    <td className="py-2 text-right tabular-nums">{line.debit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <dl className="mt-1 divide-y divide-emerald-50 text-xs">
          {receipt.purpose && <Row label="Purpose" value={receipt.purpose} />}
          {receipt.narrative && <Row label="Narration" value={receipt.narrative} />}
          {receipt.valueDate && <Row label="Value date" value={formatDay(receipt.valueDate)} />}
          {receipt.corridor && <Row label="Corridor" value={receipt.corridor} />}
        </dl>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Oakwood Finance plc is a fictional institution. This advice was prepared in the browser. No correspondent bank has been instructed.
        </p>
      </div>
    </article>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/50">{label}</dt>
      <dd className="text-right text-xs font-medium text-ink tabular-nums">{value}</dd>
    </div>
  );
}

export function AdviceModal({ receipt, onClose }) {
  const [printError, setPrintError] = useState('');
  if (!receipt) return null;
  const html = receiptDocument(receipt);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-pine-deep/45 px-4 py-8" onMouseDown={onClose}>
      <div className="w-full max-w-3xl rounded-md border border-emerald-100 bg-mint p-3 shadow-2xl" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="rounded-md border border-emerald-100 bg-white px-5 py-5">
          <ReceiptView receipt={receipt} />
        </div>
        {printError && <p className="mt-3 text-xs text-rose-700">{printError}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={() => downloadHtml(`Oakwood-${receipt.reference}.html`, html)}>Download</Button>
          <Button onClick={() => {
            const opened = printHtml(receipt.title, html);
            setPrintError(opened ? '' : 'Allow pop-up windows to print this advice.');
          }}>Print</Button>
        </div>
      </div>
    </div>
  );
}
