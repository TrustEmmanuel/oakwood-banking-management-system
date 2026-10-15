import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';
import { formatDay } from '../lib/dates';
import { downloadHtml, printHtml, receiptDocument } from '../lib/documents';
import { formatMoney } from '../lib/money';

export function PaymentStatus({ outcome, onDone, onDismiss, onSettled }) {
  const processing = outcome?.phase === 'processing';
  const success = outcome?.phase === 'success';
  const [printError, setPrintError] = useState('');
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    if (outcome?.phase !== 'processing') return undefined;
    const timer = window.setTimeout(() => settledRef.current(), 1400);
    return () => window.clearTimeout(timer);
  }, [outcome?.phase]);

  useEffect(() => {
    setPrintError('');
  }, [outcome?.receipt?.reference, outcome?.phase]);

  useEffect(() => {
    if (!outcome || processing) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') {
        if (success) onDone();
        else onDismiss();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [outcome, processing, success, onDone, onDismiss]);

  if (!outcome) return null;

  const receipt = outcome.receipt;
  const quote = receipt?.quote;

  function close() {
    if (processing) return;
    if (success) onDone();
    else onDismiss();
  }

  function downloadReceipt() {
    if (!receipt) return;
    downloadHtml(`Oakwood-${receipt.reference}.html`, receiptDocument(receipt));
  }

  function printReceipt() {
    if (!receipt) return;
    const opened = printHtml(receipt.title, receiptDocument(receipt));
    setPrintError(opened ? '' : 'The receipt could not be opened for printing.');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-deep/45 px-4" onMouseDown={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-status-title"
        aria-live="polite"
        className="w-full max-w-md rounded-md border border-emerald-100 bg-white px-5 py-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {processing && (
          <div className="py-4 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-100 border-t-pine" aria-hidden="true" />
            <h2 id="payment-status-title" className="mt-4 text-sm font-semibold text-pine">Processing</h2>
          </div>
        )}

        {success && receipt && outcome.kind === 'card' && (
          <>
            <h2 id="payment-status-title" className="text-sm font-semibold text-pine">Card Request Successful</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">It will be delivered to {outcome.deliveryAddress}.</p>
            <dl className="mt-4 divide-y divide-emerald-50 text-xs">
              <Row label="Reference" value={receipt.reference} />
              {quote && <Row label="Debit amount" value={formatMoney(quote.totalDebit, quote.debitCurrency)} strong />}
            </dl>
            <p className="mt-4 text-xs text-ink">Download or print a receipt for this card?</p>
            {printError && <p className="mt-2 text-xs text-rose-700">{printError}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onDone}>Done</Button>
              <Button variant="secondary" onClick={printReceipt}>Print receipt</Button>
              <Button onClick={downloadReceipt}>Download receipt</Button>
            </div>
          </>
        )}

        {success && receipt && outcome.kind !== 'card' && (
          <>
            <h2 id="payment-status-title" className="text-sm font-semibold text-pine">Payment successful</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {receipt.status === 'Scheduled'
                ? `The payment is scheduled for ${formatDay(receipt.valueDate)}.`
                : receipt.lines
                  ? 'The batch has been posted.'
                  : 'The payment has been posted.'}
            </p>
            <dl className="mt-4 divide-y divide-emerald-50 text-xs">
              <Row label="Reference" value={receipt.reference} />
              {quote && <Row label="Debit amount" value={formatMoney(quote.totalDebit, quote.debitCurrency)} strong />}
              {quote && <Row label="Beneficiary" value={receipt.counterparty} />}
              {receipt.lines && <Row label="Payments" value={String(receipt.lines.length)} />}
            </dl>
            <p className="mt-4 text-xs text-ink">Download or print a receipt for this payment?</p>
            {printError && <p className="mt-2 text-xs text-rose-700">{printError}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onDone}>Done</Button>
              <Button variant="secondary" onClick={printReceipt}>Print receipt</Button>
              <Button onClick={downloadReceipt}>Download receipt</Button>
            </div>
          </>
        )}

        {outcome.phase === 'failed' && (
          <>
            <h2 id="payment-status-title" className="text-sm font-semibold text-pine">Payment unsuccessful</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-rose-700" role="alert">{outcome.error || 'The payment could not be posted.'}</p>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={onDismiss}>Close</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800/50">{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold text-pine' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}
