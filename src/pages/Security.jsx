import { useState } from 'react';
import { Button, Card, Field, StatusBadge, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';
import { formatDateTime, formatDay } from '../lib/dates';

export function Security() {
  const bank = useBank();
  const profile = bank.profile;
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [pin, setPin] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [pinError, setPinError] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [reveal, setReveal] = useState(false);
  const [query, setQuery] = useState('');

  const audit = bank.audit.filter((entry) => `${entry.action} ${entry.detail} ${entry.actor}`.toLowerCase().includes(query.trim().toLowerCase()));

  function onPassword(event) {
    event.preventDefault();
    const result = bank.updatePassword(password);
    if (!result.ok) {
      setPasswordError(result.error);
      return;
    }
    setPasswordError('');
    setPassword({ current: '', next: '', confirm: '' });
  }

  function onPin(event) {
    event.preventDefault();
    const result = bank.updatePin(pin);
    if (!result.ok) {
      setPinError(result.error);
      return;
    }
    setPinError('');
    setPin({ current: '', next: '', confirm: '' });
    setReveal(false);
  }

  function toggle(key) {
    const result = bank.updateMfa({ [key]: !profile.mfa[key] });
    setMfaError(result.ok ? '' : result.error);
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/55">Administration</p>
        <h1 className="mt-1 font-serif text-[28px] font-medium text-pine">Security & access</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Password, PIN, and sign-in preferences are stored with the specimen ledger in this browser. No one-time code is sent.</p>
      </header>

      <Card className="grid gap-4 p-4 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/55">Signed-in mandate</p>
          <h2 className="mt-1 text-sm font-semibold text-pine">{profile.name}</h2>
          <dl className="mt-3 space-y-1.5 text-xs">
            <Info label="Title" value={`${profile.title} · ${profile.mandate}`} />
            <Info label="Company ID" value={profile.companyId} />
            <Info label="User ID" value={profile.userId} />
            <Info label="Email" value={profile.email} />
            <Info label="Mobile" value={profile.phone} />
            <Info label="Location" value={profile.location} />
            <Info label="Last sign-in" value={profile.lastLogin ? formatDateTime(profile.lastLogin) : 'This session'} />
            <Info label="Password changed" value={profile.passwordChangedAt ? formatDateTime(profile.passwordChangedAt) : 'Opening specimen password'} />
          </dl>
        </div>
        <div className="rounded-md border border-emerald-100 bg-emerald-50/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/55">Transaction PIN</p>
          <p className="mt-2 font-serif text-2xl tracking-[0.2em] text-pine">{reveal ? profile.pin : '••••••'}</p>
          <button type="button" className="mt-2 text-xs font-medium text-pine hover:underline" onClick={() => setReveal((value) => !value)}>{reveal ? 'Hide PIN' : 'Reveal PIN'}</button>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Wires, batches, bills, beneficiary changes, and credit movements ask for this PIN.</p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-pine">Change password</h2>
          <form className="mt-3 space-y-3" onSubmit={onPassword}>
            <Field label="Current password"><TextInput type="password" autoComplete="current-password" value={password.current} onChange={(event) => setPassword({ ...password, current: event.target.value })} /></Field>
            <Field label="New password" hint="At least 10 characters, with a letter and a number."><TextInput type="password" autoComplete="new-password" value={password.next} onChange={(event) => setPassword({ ...password, next: event.target.value })} /></Field>
            <Field label="Confirm new password"><TextInput type="password" autoComplete="new-password" value={password.confirm} onChange={(event) => setPassword({ ...password, confirm: event.target.value })} /></Field>
            {passwordError && <p className="text-xs text-rose-700">{passwordError}</p>}
            <Button type="submit">Update password</Button>
          </form>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-pine">Change transaction PIN</h2>
          <form className="mt-3 space-y-3" onSubmit={onPin}>
            <Field label="Current PIN"><TextInput inputMode="numeric" maxLength={6} value={pin.current} onChange={(event) => setPin({ ...pin, current: event.target.value })} /></Field>
            <Field label="New PIN"><TextInput inputMode="numeric" maxLength={6} value={pin.next} onChange={(event) => setPin({ ...pin, next: event.target.value })} /></Field>
            <Field label="Confirm new PIN"><TextInput inputMode="numeric" maxLength={6} value={pin.confirm} onChange={(event) => setPin({ ...pin, confirm: event.target.value })} /></Field>
            {pinError && <p className="text-xs text-rose-700">{pinError}</p>}
            <Button type="submit">Update PIN</Button>
          </form>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-pine">Sign-in methods</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Preferences are recorded for the demonstration. Authenticator, SMS, and email challenges are not issued.</p>
        {mfaError && <p className="mt-3 text-xs text-rose-700">{mfaError}</p>}
        <div className="mt-3 divide-y divide-emerald-50">
          {[
            ['authenticator', 'Authenticator app', 'Time-based code on a registered device'],
            ['sms', 'SMS', `One-time code to ${profile.phone}`],
            ['email', 'Email', `One-time code to ${profile.email}`],
          ].map(([key, label, hint]) => (
            <label key={key} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span>
                <span className="block font-medium text-ink">{label}</span>
                <span className="block text-[11px] text-slate-500">{hint}</span>
              </span>
              <input type="checkbox" checked={Boolean(profile.mfa[key])} onChange={() => toggle(key)} />
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-emerald-50 px-4 py-3">
          <div>
            <h2 className="text-[13px] font-semibold text-pine">Activity log</h2>
            <p className="text-[11px] text-slate-500">Sign-ins, payments, and security changes on this specimen.</p>
          </div>
          <div className="w-full max-w-xs">
            <TextInput value={query} placeholder="Filter the log" onChange={(event) => setQuery(event.target.value)} aria-label="Filter activity" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-[0.14em] text-emerald-800/50">
                <th className="px-4 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Actor</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Detail</th>
                <th className="px-4 py-2 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 40).map((entry) => (
                <tr key={entry.id} className="border-b border-emerald-50">
                  <td className="px-4 py-2.5 text-slate-500">{formatDay(entry.bookDate)} {formatDateTime(entry.at).split(', ').pop()}</td>
                  <td className="px-3 py-2.5">{entry.actor}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">{entry.action}</td>
                  <td className="px-3 py-2.5 text-slate-600">{entry.detail}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={entry.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-pine">Reset demo data</h2>
          <p className="mt-1 text-[11px] text-slate-500">Restores opening balances, the beneficiary directory, passwords, and PINs.</p>
        </div>
        <Button variant="secondary" onClick={bank.resetDemo}>Reset demo data</Button>
      </Card>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
