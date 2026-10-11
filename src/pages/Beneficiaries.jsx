import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Field, Modal, PinDialog, Select, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { BENEFICIARY_TYPES, COUNTRIES } from '../data/catalog';
import { countryName, validateBeneficiary } from '../lib/validate';

const EMPTY = {
  name: '',
  country: 'US',
  currency: 'USD',
  type: 'Vendor',
  bankName: '',
  bankCode: '',
  accountNumber: '',
  swift: '',
};

export function Beneficiaries() {
  const bank = useBank();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [removeId, setRemoveId] = useState(null);

  const rows = bank.beneficiaries.filter((item) => {
    const haystack = `${item.name} ${item.bankName} ${item.accountNumber} ${item.swift}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesCountry = country === 'ALL' || item.country === country;
    return matchesQuery && matchesCountry;
  });

  function submitForm(event) {
    event.preventDefault();
    const validation = validateBeneficiary(form);
    if (validation) {
      setFormError(validation);
      return;
    }
    setFormError('');
    setPinError('');
    setPinOpen(true);
  }

  function save(pin) {
    const result = bank.saveBeneficiary({ ...form, pin });
    if (!result.ok) {
      setPinError(result.error);
      return;
    }
    setPinOpen(false);
    setOpen(false);
    setForm(EMPTY);
  }

  function remove(pin) {
    const result = bank.removeBeneficiary({ id: removeId, pin });
    if (!result.ok) {
      setPinError(result.error);
      return;
    }
    setRemoveId(null);
    setPinOpen(false);
  }

  const codeLabel = form.country === 'US' ? 'ABA routing number' : form.country === 'GB' ? 'Sort code' : 'Bank code';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Directory</p>
          <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Beneficiaries</h1>
          <p className="mt-1 text-xs text-slate-500">Saved counterparties for wires, payroll, and intra-group funding.</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setFormError(''); setOpen(true); }}>Add beneficiary</Button>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="Search">
            <TextInput value={query} placeholder="Name, bank, account, SWIFT" onChange={(event) => setQuery(event.target.value)} />
          </Field>
          <Field label="Country">
            <Select value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="ALL">All</option>
              {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                <th className="py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Country</th>
                <th className="px-3 py-2 font-semibold">Bank</th>
                <th className="px-3 py-2 font-semibold">Account number</th>
                <th className="px-3 py-2 font-semibold">CCY</th>
                <th className="py-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No beneficiaries match this filter.</td></tr>
              )}
              {rows.map((item) => (
                <tr key={item.id} className="border-b border-emerald-50">
                  <td className="py-2.5 font-medium text-ink">{item.name}</td>
                  <td className="px-3 py-2.5"><Badge title={countryName(item.country)}>{item.country}</Badge></td>
                  <td className="px-3 py-2.5">
                    <div>{item.bankName}</div>
                    {item.country !== 'NG' && <div className="text-[11px] text-slate-500">{item.swift || 'SWIFT not held'}</div>}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-ink">{item.accountNumber}</td>
                  <td className="px-3 py-2.5">{item.currency}</td>
                  <td className="py-2.5 text-right">
                    <Link to={`/transfers?beneficiary=${item.id}`} className="font-medium text-pine hover:underline">Send funds</Link>
                    <button type="button" className="ml-3 text-rose-800 hover:underline" onClick={() => { setRemoveId(item.id); setPinError(''); setPinOpen(true); }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} title="Add beneficiary" subtitle="Directory entries require the transaction PIN" onClose={() => setOpen(false)}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitForm}>
          <Field label="Legal name"><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Type">
            <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              {BENEFICIARY_TYPES.map((type) => <option key={type}>{type}</option>)}
            </Select>
          </Field>
          <Field label="Country">
            <Select value={form.country} onChange={(event) => {
              const next = event.target.value;
              const currency = COUNTRIES.find((item) => item.code === next)?.currency || 'USD';
              setForm({ ...form, country: next, currency });
            }}>
              {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
              <option>USD</option><option>GBP</option><option>NGN</option>
            </Select>
          </Field>
          <Field label="Bank name"><TextInput value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} /></Field>
          {form.country !== 'NG' && <Field label={codeLabel}><TextInput value={form.bankCode} onChange={(event) => setForm({ ...form, bankCode: event.target.value })} /></Field>}
          <Field label={form.country === 'NG' ? 'NUBAN' : 'Account number'}><TextInput value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} /></Field>
          {form.country !== 'NG' && <Field label="SWIFT / BIC"><TextInput value={form.swift} onChange={(event) => setForm({ ...form, swift: event.target.value })} /></Field>}
          {formError && <p className="text-xs text-rose-700 sm:col-span-2">{formError}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </Modal>

      <PinDialog
        open={pinOpen}
        title={removeId ? 'Remove beneficiary' : 'Save beneficiary'}
        detail={removeId ? 'This does not reverse historical payments.' : form.name || 'New directory entry'}
        error={pinError}
        onClose={() => { setPinOpen(false); setRemoveId(null); }}
        onSubmit={removeId ? remove : save}
      />
    </div>
  );
}
