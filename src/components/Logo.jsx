export function Logo({ variant = 'onDark', wordmark = true }) {
  const onDark = variant === 'onDark';
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] text-[11px] font-semibold tracking-wide ${onDark ? 'bg-white/10 text-emerald-50 ring-1 ring-white/15' : 'bg-pine text-white'}`}>
        OF
      </span>
      {wordmark && (
        <span className="leading-none">
          <span className={`block text-[12px] font-semibold tracking-[0.18em] ${onDark ? 'text-white' : 'text-pine'}`}>OAKWOOD</span>
          <span className={`mt-1 block text-[9px] font-medium tracking-[0.22em] ${onDark ? 'text-emerald-200/75' : 'text-emerald-800/70'}`}>FINANCE</span>
        </span>
      )}
    </div>
  );
}
