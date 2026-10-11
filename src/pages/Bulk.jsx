import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentStatus } from '../components/PaymentStatus';
import { Button, Card, Field, PinDialog, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { bulkTemplateBlob, parseBulkWorkbook } from '../lib/bulkFile';
import { assessBulk } from '../lib/ledger';
import { formatMoney, parseAmount } from '../lib/money';
import { accountLine, countryName } from '../lib/validate';

function blank(partial = {}) {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    beneficiaryId: '',
    accountId: '',
    amount: '',
    narrative: '',
    ...partial,
  };
}

export function Bulk() {
  const bank = useBank();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [purpose, setPurpose] = useState('');
  const [rows, setRows] = useState([]);
  const [attempted, setAttempted] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [outcome, setOutcome] = useState(null);
  const [fileMessage, setFileMessage] = useState('');
  const [fileError, setFileError] = useState('');

  const assessment = useMemo(
    () => (rows.length ? assessBulk(bank.snapshot, { purpose, rows }) : null),
    [bank.snapshot, purpose, rows],
  );

  function authorize() {
    setAttempted(true);
    if (!rows.length) return;
    const next = assessBulk(bank.snapshot, { purpose, rows });
    if (!next.ok) return;
    setPinError('');
    setPinOpen(true);
  }

  function onPin(pin) {
    const result = bank.bulk({ purpose, rows, pin });
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
      setRows([]);
      setPurpose('');
      setFileMessage('');
      setFileError('');
      setAttempted(false);
    }
  }

  function settleOutcome() {
    setOutcome((current) => {
      if (!current || current.phase !== 'processing') return current;
      return { ...current, phase: current.receipt ? 'success' : 'failed' };
    });
  }

  function finishPayment() {
    setOutcome(null);
    navigate('/');
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(bulkTemplateBlob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Oakwood-bulk-template.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearFile() {
    setRows([]);
    setFileMessage('');
    setFileError('');
    setAttempted(false);
  }

  async function onUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseBulkWorkbook(await file.arrayBuffer(), bank.accounts);
      if (!parsed.ok) {
        setFileError(parsed.error);
        setFileMessage('');
        return;
      }
      setRows(parsed.rows.map((row) => blank(row)));
      setFileError('');
      setFileMessage(parsed.message);
      setAttempted(false);
    } catch {
      setFileError('That file could not be read. Download the template and upload the completed Excel file.');
      setFileMessage('');
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Payments</p>
          <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Bulk disbursement</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Download the Excel template and load Nigerian payments only. Each line pays a NUBAN from the NGN account. The batch posts entirely, or not at all.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={downloadTemplate}>Download template</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Load bulk upload file</Button>
          <Button variant="secondary" onClick={clearFile}>Clear</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={onUpload} />
        </div>
      </header>
      {fileMessage && <p className="text-xs text-emerald-800">{fileMessage}</p>}
      {fileError && <p className="text-xs leading-relaxed text-rose-700" role="alert">{fileError}</p>}

      <Card className="p-4">
        <div className="max-w-md">
          <Field label="Batch purpose">
            <TextInput value={purpose} maxLength={80} placeholder="Input Reason" onChange={(event) => setPurpose(event.target.value)} />
          </Field>
        </div>
        {!rows.length && <p className="mt-4 text-xs text-slate-500">Upload an Excel file to load this batch.</p>}
        {rows.length > 0 && (
          <ul className="mt-4 divide-y divide-emerald-50">
            {rows.map((row) => {
              const payee = row.manual;
              const account = bank.accounts.find((item) => item.id === row.accountId);
              return (
                <li key={row.key} className="flex flex-wrap items-start justify-between gap-3 py-3 text-xs">
                  <div>
                    <p className="font-medium text-pine">{payee?.name || 'Beneficiary'}</p>
                    <p className="mt-1 text-slate-500">{payee ? `${countryName(payee.country)} · ${payee.bankName} · ${accountLine(payee)}` : ''}</p>
                    <p className="mt-1 text-slate-500">{account?.name} · {row.narrative}</p>
                  </div>
                  <p className="tabular-nums text-ink">{payee ? formatMoney(parseAmount(row.amount), payee.currency) : row.amount}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-pine">Batch totals</h2>
        {assessment?.ok ? (
          <ul className="mt-3 space-y-1 text-xs">
            {Object.entries(assessment.totals || {}).map(([id, total]) => {
              const account = bank.accounts.find((item) => item.id === id);
              return <li key={id} className="flex justify-between tabular-nums"><span>{account?.name}</span><span>{formatMoney(total, account?.currency || 'USD')}</span></li>;
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Totals appear when the uploaded file can be quoted.</p>
        )}
        {assessment?.duplicates?.length > 0 && (
          <p className="mt-3 text-[11px] text-amber-800">Duplicate lines for {assessment.duplicates.join(', ')}. You can still authorize the batch.</p>
        )}
        {attempted && !rows.length && <p className="mt-3 text-xs text-rose-700" role="alert">Upload an Excel file before authorizing.</p>}
        {attempted && assessment && !assessment.ok && <p className="mt-3 text-xs text-rose-700" role="alert">{assessment.error}</p>}
        <Button className="mt-4" onClick={authorize} disabled={!rows.length}>Authorize batch</Button>
      </Card>

      <PinDialog open={pinOpen} title="Authorize batch" detail={`${rows.length} ${rows.length === 1 ? 'line' : 'lines'} · SHA on cross-border items`} error={pinError} onClose={() => setPinOpen(false)} onSubmit={onPin} />
      <PaymentStatus outcome={outcome} onDone={finishPayment} onDismiss={() => setOutcome(null)} onSettled={settleOutcome} />
    </div>
  );
}
