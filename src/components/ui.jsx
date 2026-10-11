import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { formatMoney } from '../lib/money';

export const inputClass = 'h-9 w-full rounded-md border border-emerald-200 bg-white px-2.5 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-pine focus:ring-2 focus:ring-emerald-800/10';

const buttonStyles = {
  primary: 'bg-pine text-white hover:bg-pine-soft',
  secondary: 'border border-emerald-200 bg-white text-pine hover:bg-emerald-50',
  ghost: 'text-pine hover:bg-emerald-50',
  danger: 'border border-rose-200 bg-white text-rose-800 hover:bg-rose-50',
};

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  const height = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${height} ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900/55">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[11px] text-rose-700">{error}</span> : hint ? <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className = '', ...props }) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }) {
  return <select className={`${inputClass} ${className}`} {...props} />;
}

export function TextArea({ className = '', ...props }) {
  return <textarea className={`${inputClass} h-20 py-2 ${className}`} {...props} />;
}

const badgeTones = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200',
  sky: 'bg-sky-50 text-sky-900 ring-sky-200',
  slate: 'bg-slate-50 text-slate-600 ring-slate-200',
  rose: 'bg-rose-50 text-rose-800 ring-rose-200',
};

export function Badge({ tone = 'slate', children, title }) {
  return (
    <span title={title} className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const tone = {
    Settled: 'emerald',
    Successful: 'emerald',
    Processing: 'amber',
    Scheduled: 'sky',
    'In review': 'sky',
    Active: 'emerald',
    Repaid: 'slate',
    Compliant: 'emerald',
    Success: 'emerald',
    Refused: 'rose',
  }[status] || 'slate';
  return <Badge tone={tone}>{status}</Badge>;
}

export function Card({ className = '', children }) {
  return <section className={`min-w-0 rounded-md border border-emerald-100 bg-white shadow-[0_18px_40px_-32px_rgba(6,78,59,0.7)] ${className}`}>{children}</section>;
}

export function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-emerald-50 px-4 py-3">
      <div>
        {eyebrow && <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/50">{eyebrow}</div>}
        <h2 className="text-[13px] font-semibold text-pine">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function MoneyText({ amount, currency, signed = false }) {
  const positive = signed && amount > 0;
  return <span className={`tabular-nums ${positive ? 'font-medium text-emerald-700' : 'text-ink'}`}>{formatMoney(amount, currency, { signed })}</span>;
}

export function Modal({ open, title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-pine-deep/45 px-4 py-8" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-md border border-emerald-100 bg-white shadow-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-emerald-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-pine">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-sm p-1 text-slate-400 hover:bg-emerald-50 hover:text-pine" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function PinDialog({ open, title, detail, error, onClose, onSubmit }) {
  const [digits, setDigits] = useState(() => Array(6).fill(''));
  const refs = useRef([]);

  useEffect(() => {
    if (!open) return undefined;
    setDigits(Array(6).fill(''));
    const timer = setTimeout(() => refs.current[0]?.focus(), 40);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!error) return;
    setDigits(Array(6).fill(''));
    refs.current[0]?.focus();
  }, [error]);

  function write(index, value) {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    const chars = clean.slice(0, 6 - index).split('');
    const next = [...digits];
    chars.forEach((char, offset) => {
      next[index + offset] = char;
    });
    setDigits(next);
    const focusAt = Math.min(index + chars.length, 5);
    refs.current[focusAt]?.focus();
    if (next.every(Boolean)) onSubmit(next.join(''));
  }

  return (
    <Modal open={open} title={title} subtitle={detail} onClose={onClose}>
      <p className="text-xs leading-relaxed text-slate-500">Enter the 6-digit transaction PIN for this mandate. The PIN is checked only in this browser.</p>
      <div className="mt-4 flex justify-between gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => { refs.current[index] = node; }}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={`PIN digit ${index + 1}`}
            value={digit}
            onChange={(event) => write(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digits[index] && index > 0) {
                const next = [...digits];
                next[index - 1] = '';
                setDigits(next);
                refs.current[index - 1]?.focus();
              }
            }}
            className="h-12 w-full rounded-md border border-emerald-200 text-center font-serif text-lg text-pine outline-none focus:border-pine focus:ring-2 focus:ring-emerald-800/10"
          />
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-rose-700" role="alert">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
