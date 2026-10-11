import { formatDay, formatDateTime } from './dates.js';
import { formatMoney } from './money.js';
import { typeLabel } from '../data/catalog.js';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function shell(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; background: #f4f7f5; color: #1e293b; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; }
    .page { max-width: 860px; margin: 28px auto; background: #fff; border: 1px solid #d1fae5; padding: 36px 40px 28px; position: relative; overflow: hidden; }
    .wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 68px; letter-spacing: .28em; color: rgba(6,78,59,.055); transform: rotate(-18deg); font-weight: 600; pointer-events: none; }
    .brand { color: #064e3b; letter-spacing: .18em; font-size: 12px; font-weight: 600; }
    h1 { font-family: Georgia, "Times New Roman", serif; color: #064e3b; font-size: 26px; font-weight: 500; margin: 8px 0 0; }
    .meta { margin-top: 8px; color: #64748b; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 18px; }
    th { text-align: left; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #065f46; border-bottom: 1px solid #d1fae5; padding: 8px 6px; }
    td { border-bottom: 1px solid #ecfdf5; padding: 8px 6px; vertical-align: top; }
    .right { text-align: right; font-variant-numeric: tabular-nums; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 22px; }
    .label { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #065f46; }
    .foot { margin-top: 26px; font-size: 10px; line-height: 1.55; color: #64748b; }
    @media print { body { background: white; } .page { margin: 0; border: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="wm">SPECIMEN</div>
    ${body}
  </div>
</body>
</html>`;
}

export function receiptDocument(receipt) {
  const quote = receipt.quote;
  const amountRows = quote ? `
    <tr><td>Payment amount</td><td class="right">${escapeHtml(formatMoney(quote.paymentAmount, quote.paymentCurrency))}</td></tr>
    <tr><td>Rate</td><td class="right">${escapeHtml(quote.rateText)}</td></tr>
    <tr><td>${escapeHtml(quote.feeLabel || 'Cable charge')}</td><td class="right">${escapeHtml(formatMoney(quote.fee, quote.feeCurrency))}</td></tr>
    <tr><td>${receipt.title === 'Credit draw advice' ? 'Amount credited' : 'Amount posted'}</td><td class="right">${escapeHtml(formatMoney(quote.totalDebit, quote.debitCurrency))}</td></tr>
    <tr><td>Beneficiary receives</td><td class="right">${escapeHtml(formatMoney(quote.beneficiaryCredit, quote.paymentCurrency))}</td></tr>
  ` : '';
  const lineRows = (receipt.lines || []).map((line) => `
    <tr>
      <td>${escapeHtml(line.reference)}</td>
      <td>${escapeHtml(line.counterparty)}</td>
      <td>${escapeHtml(line.account)}</td>
      <td class="right">${escapeHtml(line.payment)}</td>
      <td class="right">${escapeHtml(line.debit)}</td>
    </tr>
  `).join('');
  const body = `
    <div class="brand">OAKWOOD FINANCE</div>
    <h1>${escapeHtml(receipt.title)}</h1>
    <div class="meta">${escapeHtml(receipt.reference)} · ${escapeHtml(formatDateTime(receipt.createdAt))} · ${escapeHtml(receipt.status)}</div>
    <div class="pair">
      <div>
        <div class="label">From</div>
        <div style="margin-top:6px;font-weight:600;color:#064e3b;">${escapeHtml(receipt.accountName)}</div>
        <div style="font-size:12px;color:#475569;">${escapeHtml(receipt.bank || '')}</div>
      </div>
      <div>
        <div class="label">To</div>
        <div style="margin-top:6px;font-weight:600;color:#064e3b;">${escapeHtml(receipt.counterparty)}</div>
        <div style="font-size:12px;color:#475569;">${escapeHtml(receipt.counterpartyDetail || '')}</div>
      </div>
    </div>
    ${quote ? `<table><thead><tr><th>Component</th><th class="right">Amount</th></tr></thead><tbody>${amountRows}</tbody></table>` : ''}
    ${lineRows ? `<table><thead><tr><th>Reference</th><th>Beneficiary</th><th>Account</th><th class="right">Payment</th><th class="right">Debit</th></tr></thead><tbody>${lineRows}</tbody></table>` : ''}
    <table>
      <tbody>
        ${receipt.purpose ? `<tr><td>Purpose</td><td class="right">${escapeHtml(receipt.purpose)}</td></tr>` : ''}
        ${receipt.narrative ? `<tr><td>Narration</td><td class="right">${escapeHtml(receipt.narrative)}</td></tr>` : ''}
        ${receipt.valueDate ? `<tr><td>Value date</td><td class="right">${escapeHtml(formatDay(receipt.valueDate))}</td></tr>` : ''}
        ${receipt.corridor ? `<tr><td>Corridor</td><td class="right">${escapeHtml(receipt.corridor)}</td></tr>` : ''}
      </tbody>
    </table>
    <p class="foot">Oakwood Finance plc is a fictional institution. This advice is a specimen generated in the browser. No correspondent bank has been instructed and no funds have left this device.</p>
  `;
  return shell(`${receipt.title} ${receipt.reference}`, body);
}

export function statementDocument({ entity, filters, rows, totals, opening }) {
  const bodyRows = rows.map((tx) => `
    <tr>
      <td>${escapeHtml(formatDay(tx.bookDate))}</td>
      <td>${escapeHtml(tx.reference)}</td>
      <td>${escapeHtml(tx.counterparty)}</td>
      <td>${escapeHtml(typeLabel(tx.type))}</td>
      <td>${escapeHtml(tx.corridor)}</td>
      <td class="right">${escapeHtml(formatMoney(tx.amount, tx.currency, { signed: true }))}</td>
      <td>${escapeHtml(tx.status)}</td>
    </tr>
  `).join('');
  const totalRows = totals.map((total) => `
    <tr>
      <td>${escapeHtml(total.currency)}</td>
      <td class="right">${escapeHtml(formatMoney(total.credits, total.currency))}</td>
      <td class="right">${escapeHtml(formatMoney(total.debits, total.currency))}</td>
      <td class="right">${escapeHtml(formatMoney(total.net, total.currency, { signed: true }))}</td>
    </tr>
  `).join('');
  const openingRows = (opening || []).map((item) => `
    <tr><td>${escapeHtml(item.account)}</td><td class="right">${escapeHtml(formatMoney(item.opening, item.currency))}</td><td class="right">${escapeHtml(formatMoney(item.closing, item.currency))}</td></tr>
  `).join('');
  const body = `
    <div class="brand">OAKWOOD FINANCE</div>
    <h1>Account statement</h1>
    <div class="meta">${escapeHtml(entity)} · ${escapeHtml(filters)}</div>
    ${openingRows ? `<table><thead><tr><th>Account</th><th class="right">Opening</th><th class="right">Closing</th></tr></thead><tbody>${openingRows}</tbody></table>` : ''}
    <table>
      <thead>
        <tr><th>Date</th><th>Reference</th><th>Beneficiary</th><th>Type</th><th>Payment type</th><th class="right">Amount</th><th>Status</th></tr>
      </thead>
      <tbody>${bodyRows || '<tr><td colspan="7">No entries in this range.</td></tr>'}</tbody>
    </table>
    <table>
      <thead><tr><th>Currency</th><th class="right">Credits</th><th class="right">Debits</th><th class="right">Net</th></tr></thead>
      <tbody>${totalRows}</tbody>
    </table>
    <p class="foot">Specimen statement prepared from the ledger stored in this browser. Oakwood Finance plc is fictional. Processing items have already been debited and are awaiting a simulated correspondent acknowledgement.</p>
  `;
  return shell('Oakwood statement', body);
}

export function printHtml(title, html) {
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff;z-index:60;';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    frame.remove();
  };
  win.addEventListener('afterprint', cleanup);

  const triggerPrint = () => {
    win.focus();
    try {
      win.print();
    } finally {
      setTimeout(cleanup, 60_000);
    }
  };
  win.requestAnimationFrame(() => {
    win.requestAnimationFrame(() => setTimeout(triggerPrint, 50));
  });
  return true;
}

export function downloadHtml(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, rows) {
  const header = ['Date', 'Reference', 'Account', 'Beneficiary', 'Narrative', 'Type', 'Payment type', 'Currency', 'Amount', 'Status'];
  const lines = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
