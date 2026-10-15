import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Landmark, PieChart, PiggyBank, Shield, TrendingUp } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Button, Field, Modal, Select, TextInput } from '../components/ui';
import { useBank } from '../context/BankContext';

const PRODUCTS = [
  { title: 'Cards', text: 'Corporate cards for travel, suppliers, and everyday group spend.', icon: CreditCard, tint: 'bg-emerald-50 text-pine' },
  { title: 'Loans', text: 'Revolving credit and term facilities sized for the treasury.', icon: Landmark, tint: 'bg-pine/10 text-pine' },
  { title: 'Fixed deposit', text: 'Place surplus cash for a set term and a known return.', icon: PiggyBank, tint: 'bg-amber-50 text-amber-800' },
  { title: 'Insurance', text: 'Cover for people, property, and the trade you finance.', icon: Shield, tint: 'bg-sky-50 text-sky-800' },
  { title: 'Mutual funds', text: 'Pooled funds held beside the operating accounts.', icon: PieChart, tint: 'bg-teal-50 text-teal-800' },
  { title: 'Investment', text: 'Short-term investments for cash that is not needed today.', icon: TrendingUp, tint: 'bg-emerald-100/80 text-emerald-900' },
];

export function Login() {
  const { session, profile, profiles, login } = useBank();
  const [preset, setPreset] = useState('');
  const [form, setForm] = useState({ companyId: '', userId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [signOpen, setSignOpen] = useState(false);

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
    <div className="min-h-screen bg-[#f7fbf8]">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo variant="onLight" />
          <nav className="ml-auto hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#products" className="hover:text-pine">Products</a>
            <a href="#offers" className="hover:text-pine">Offers</a>
            <a href="#centres" className="hover:text-pine">Centres</a>
          </nav>
          <Button className="ml-auto md:ml-0" onClick={() => setSignOpen(true)}>Sign in</Button>
        </div>
      </header>

      <section className="relative min-h-[520px] overflow-hidden bg-pine-deep sm:min-h-[620px]">
        <img
          src="/hero-wide.jpg"
          alt="A customer smiling as she signs in to Oakwood online banking on her laptop"
          className="absolute inset-0 h-full w-full object-cover object-[78%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-pine-deep/90 via-pine-deep/50 to-pine-deep/10" />
        <div className="relative mx-auto flex min-h-[520px] max-w-6xl items-center px-4 py-16 sm:min-h-[620px] sm:px-6">
          <div className="max-w-xl text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Global corporate banking</p>
            <h1 className="mt-4 max-w-lg font-serif text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl">Multi-Currency Banking Management System</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-emerald-50/90">
              Multi-currency operating accounts for Oakwood Finance. Sign in to move dollars, sterling, and naira from one desk.
            </p>
            <div className="mt-6 flex flex-col items-start gap-3">
              <a href="#products"><Button variant="secondary">Test out our banking product</Button></a>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSignOpen(true)} className="h-9 rounded-md border border-white/80 px-3 text-[13px] font-medium text-white hover:bg-white/10">Sign in</button>
                <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                  <ArrowLeft size={18} strokeWidth={1.75} />
                  Select here
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800/60">For the group</p>
            <h2 className="mt-2 font-serif text-3xl font-medium text-pine">Apply for your banking products</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-500">Cards, credit, deposits, cover, and investments, arranged beside the operating accounts.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((item) => (
            <button key={item.title} type="button" onClick={() => setSignOpen(true)} className="group rounded-2xl border border-emerald-100 bg-white p-5 text-left shadow-[0_18px_40px_-30px_rgba(6,78,59,0.55)] transition hover:-translate-y-0.5 hover:border-emerald-200">
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.tint}`}>
                <item.icon size={26} strokeWidth={1.6} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-pine">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.text}</p>
              <p className="mt-4 text-xs font-medium text-pine group-hover:underline">Sign in to continue</p>
            </button>
          ))}
        </div>
      </section>

      <section id="offers" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800/60">This season</p>
              <h2 className="mt-2 font-serif text-3xl font-medium text-pine">Exclusive offers</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-500">Specimen terms for the Oakwood treasury. Nothing is sent to a correspondent bank.</p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="relative isolate flex min-h-[460px] flex-col justify-end overflow-hidden rounded-3xl bg-pine-deep p-8 text-white shadow-[0_24px_50px_-32px_rgba(2,44,34,0.8)] sm:min-h-[520px]">
              <img src="/currencies-stack.jpg?v=2" alt="" className="pointer-events-none absolute left-1/2 top-0 -z-10 h-auto w-[148%] max-w-none -translate-x-1/2" />
              <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-pine-deep from-[14%] via-pine-deep/78 via-[32%] to-transparent" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Operating accounts</p>
              <h3 className="mt-3 max-w-sm font-serif text-3xl font-medium leading-tight">Dollars, sterling, and naira on one desk.</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-50/80">Hold the cash you spend in the currency you spend it. New York, London, and Lagos sit on the same book.</p>
            </article>
            <div className="grid gap-4">
              <article className="relative isolate flex min-h-[240px] flex-col justify-center overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
                <img src="/instant-payment.jpg?v=1" alt="" className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-[82%] object-cover object-[70%_28%]" />
                <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-emerald-50 from-[22%] via-emerald-50/92 via-[46%] to-emerald-50/15" />
                <div className="relative max-w-[15rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800/60">Nigeria</p>
                  <h3 className="mt-2 font-serif text-2xl font-medium text-pine">Instant Payments</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">Same-day naira payments instantly, via NIP and NPS.</p>
                </div>
              </article>
              <article className="relative isolate flex min-h-[240px] flex-col justify-center overflow-hidden rounded-3xl border border-amber-100 bg-amber-50 p-6">
                <img src="/receipt-phone.jpg?v=2" alt="" className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-[82%] object-cover object-[72%_55%]" />
                <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-amber-50 from-[22%] via-amber-50/92 via-[46%] to-amber-50/15" />
                <div className="relative max-w-[15rem]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800/70">Advice</p>
                  <h3 className="mt-2 font-serif text-2xl font-medium text-pine">A receipt for every payment.</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">Download the advice from transaction history after the instruction is posted.</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="centres" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800/60">Where Oakwood sits</p>
        <h2 className="mt-2 font-serif text-3xl font-medium text-pine">New York, London, Lagos.</h2>
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-white p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/50">Centres</dt>
            <dd className="mt-2 text-sm text-pine">New York, London, Lagos</dd>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/50">Currencies</dt>
            <dd className="mt-2 text-sm text-pine">USD · GBP · NGN</dd>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/50">Authority</dt>
            <dd className="mt-2 text-sm text-pine">Single-sign specimen</dd>
          </div>
        </dl>
        <p className="mt-6 max-w-md text-xs leading-relaxed text-slate-500">Oakwood Finance plc is fictional. Credentials, balances, and payment instructions never leave this browser.</p>
      </section>

      <Modal open={signOpen} rounded blur title="Sign in" subtitle="Choose a role" subtitleClassName="mt-1 text-sm font-bold text-pine-deep" onClose={() => setSignOpen(false)}>
        <form className="space-y-3.5" onSubmit={onSubmit} noValidate>
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
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
      </Modal>
    </div>
  );
}
