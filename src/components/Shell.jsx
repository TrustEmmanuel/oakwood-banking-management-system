import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight,
  History,
  CreditCard,
  Landmark,
  Layers,
  ListPlus,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  RotateCcw,
  Scale,
  ScrollText,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { Button, Modal } from './ui';
import { useBank } from '../context/BankContext';
import { convert, formatRate } from '../lib/money';

const NAV = [
  { label: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { label: 'Accounts', items: [{ to: '/accounts', label: 'Accounts', icon: Landmark }] },
  { label: 'Services', items: [{ to: '/cards', label: 'Cards', icon: CreditCard }] },
  {
    label: 'Payments',
    items: [
      { to: '/transfers', label: 'Single transfer', icon: ArrowLeftRight },
      { to: '/multiple', label: 'Multiple transfer', icon: ListPlus },
      { to: '/bulk', label: 'Bulk disbursement', icon: Layers },
      { to: '/bills', label: 'Bill payments', icon: ReceiptText },
      { to: '/beneficiaries', label: 'Beneficiaries', icon: Users },
      { to: '/history', label: 'Transaction history', icon: History },
    ],
  },
  { label: 'Reporting', items: [{ to: '/statements', label: 'Statements', icon: ScrollText }] },
  { label: 'Financing', items: [{ to: '/credit', label: 'Credit facilities', icon: Scale }] },
  { label: 'Administration', items: [{ to: '/security', label: 'Security & access', icon: Shield }] },
];

const TITLES = {
  '/': 'Dashboard',
  '/accounts': 'Accounts',
  '/cards': 'Cards',
  '/transfers': 'Single transfer',
  '/multiple': 'Multiple transfer',
  '/bulk': 'Bulk disbursement',
  '/bills': 'Bill payments',
  '/beneficiaries': 'Beneficiaries',
  '/history': 'Transaction history',
  '/statements': 'Statements',
  '/credit': 'Credit facilities',
  '/security': 'Security & access',
};

function titleFor(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/accounts/')) return 'Account';
  return 'Oakwood Finance';
}

function initials(name) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function Shell() {
  const { profile, logout, resetDemo, toast } = useBank();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    document.title = `${titleFor(location.pathname)} · Oakwood Finance`;
  }, [location.pathname]);

  const pairs = [
    ['GBP/USD', convert(1, 'GBP', 'USD')],
    ['USD/NGN', convert(1, 'USD', 'NGN')],
    ['GBP/NGN', convert(1, 'GBP', 'NGN')],
  ];

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-4">
        <Logo />
        <p className="mt-3 text-[11px] text-emerald-100/70">Oakwood Finance plc</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/70">Specimen</p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/55">{group.label}</p>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] ${isActive ? 'bg-white/10 text-white' : 'text-emerald-50/80 hover:bg-white/5 hover:text-white'}`}
                >
                  <item.icon size={15} strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-3 py-3">
        <button type="button" onClick={() => setConfirmReset(true)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] text-emerald-50/80 hover:bg-white/5 hover:text-white">
          <RotateCcw size={14} />
          Reset demo data
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] bg-pine-deep lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-pine-deep/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[260px] bg-pine-deep">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0 lg:pl-[232px]">
        <header className="no-print sticky top-0 z-20 border-b border-emerald-100 bg-white/85 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button type="button" className="rounded-md p-1.5 text-pine lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-pine">{titleFor(location.pathname)}</p>
              <p className="truncate text-[11px] text-slate-500">Global treasury specimen</p>
            </div>
            <div className="ml-auto hidden items-center gap-4 lg:flex">
              {pairs.map(([label, value]) => (
                <div key={label} className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
                  <div className="text-xs font-medium tabular-nums text-ink">{formatRate(value)}</div>
                </div>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-pine text-[11px] font-semibold text-white">{initials(profile.name)}</span>
              <div className="hidden xl:block">
                <p className="text-xs font-medium text-ink">{profile.name}</p>
                <p className="text-[11px] text-slate-500">{profile.title}</p>
              </div>
              <button type="button" onClick={logout} className="rounded-md p-1.5 text-pine hover:bg-emerald-50" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto min-w-0 max-w-[1360px] px-4 py-5 sm:px-6">
          <Outlet />
        </main>
        <p className="no-print mx-auto max-w-[1360px] px-4 pb-8 text-[11px] leading-relaxed text-slate-500 sm:px-6">
          Specimen environment. Balances, payees, and credentials stay in this browser. Oakwood Finance plc is a fictional institution and no payment is sent.
        </p>
      </div>
      {toast && (
        <div className="no-print fixed bottom-4 right-4 z-50 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-pine shadow-lg" role="status">
          {toast}
        </div>
      )}
      <Modal open={confirmReset} title="Restore specimen data" subtitle="Opening balances, payees, credentials, and facilities" onClose={() => setConfirmReset(false)}>
        <p className="text-sm leading-relaxed text-slate-600">Transfers, bills, and security changes made in this browser will be replaced with the original demonstration ledger. Your current sign-in stays open.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button onClick={() => { resetDemo(); setConfirmReset(false); }}>Restore specimen</Button>
        </div>
      </Modal>
    </div>
  );
}
