import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button, Field, Select, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';

export function Login() {
  const { session, profile, profiles, login } = useBank();
  const [preset, setPreset] = useState('');
  const [form, setForm] = useState({ companyId: '', userId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (session && profile) return <Navigate to="/" replace />;

  function applyPreset(id) {
    setPreset(id);
    const match = profiles.find((item) => item.id === id);
    if (!match) return;
    setForm({ companyId: match.companyId, userId: match.userId, password: match.password });
    setError('');
  }

  function onSubmit(event) {
    event.preventDefault();
    const result = login(form);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(400px,0.92fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-pine-deep text-emerald-50 lg:block">
        <img
          src="/signin-hero.jpg"
          alt="A customer smiling as she signs in to Oakwood online banking"
          className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pine-deep via-pine-deep/80 to-pine-deep/20" />
        <div className="relative flex h-full min-h-screen flex-col justify-between px-12 py-10">
          <Logo />
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">Global corporate banking</p>
            <div className="mt-4 h-px w-10 bg-emerald-300/80" />
            <h1 className="mt-5 max-w-lg font-serif text-[42px] font-medium leading-[1.15] tracking-tight text-white">Treasury for a multi-currency group.</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-emerald-100/75">
              Multi-currency operating accounts for Oakwood Finance. Instructions settle against a specimen ledger held in this browser.
            </p>
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/60">Centres</dt>
                <dd className="mt-2 text-sm text-white">New York, London, Lagos</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/60">Currencies</dt>
                <dd className="mt-2 text-sm text-white">USD · GBP · NGN</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/60">Authority</dt>
                <dd className="mt-2 text-sm text-white">Single-sign specimen</dd>
              </div>
            </dl>
          </div>
          <p className="max-w-md text-[11px] leading-relaxed text-emerald-100/50">
            Oakwood Finance plc is fictional. Credentials, balances, and payment instructions never leave this browser.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 overflow-hidden rounded-md lg:hidden">
            <img src="/signin-hero.jpg" alt="A customer smiling as she signs in to Oakwood online banking" className="h-44 w-full object-cover object-[center_20%]" />
          </div>
          <div className="rounded-md border border-emerald-100 bg-white px-6 py-6 shadow-[0_24px_50px_-36px_rgba(6,78,59,0.8)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/60">Mandate sign-in</p>
            <h2 className="mt-1 font-serif text-[28px] font-medium text-pine">Sign in</h2>
            <form className="mt-5 space-y-3.5" onSubmit={onSubmit} noValidate>
              <Field label="Select role" hint="Prefills a published specimen user. You can still type the fields yourself.">
                <Select value={preset} onChange={(event) => applyPreset(event.target.value)}>
                  <option value="">Choose role</option>
                  <option value="cfo">David Gonzalez — Chief Financial Officer / Global Treasurer</option>
                  <option value="controller">Sarah Smith — Assistant Controller</option>
                </Select>
              </Field>
              <Field label="Company ID">
                <TextInput value={form.companyId} autoComplete="off" spellCheck={false} onChange={(event) => setForm({ ...form, companyId: event.target.value })} />
              </Field>
              <Field label="User ID">
                <TextInput value={form.userId} autoComplete="username" spellCheck={false} onChange={(event) => setForm({ ...form, userId: event.target.value })} />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <TextInput
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    autoComplete="current-password"
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    className="pr-16"
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-pine" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>
              {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
              <Button type="submit" className="mt-1 w-full">Sign in</Button>
            </form>
          </div>
          <div className="mt-4 rounded-md border border-emerald-100 bg-white/70 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/60">Specimen access</p>
            <div className="mt-2 space-y-2">
              {profiles.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-2 text-[11px] text-slate-600">
                  <div>
                    <p className="font-medium text-ink">{item.name}</p>
                    <p>{item.companyId} · {item.userId} · {item.password}</p>
                  </div>
                  <p className="tabular-nums text-pine">PIN {item.pin}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
