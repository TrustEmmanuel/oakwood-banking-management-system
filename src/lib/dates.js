export function pad(value) {
  return String(value).padStart(2, '0');
}

export function todayISO(base = new Date()) {
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

export function isoDate(monthOffset, day, base = new Date()) {
  const target = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const dim = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, dim));
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
}

export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

export function atMonthOffset(monthOffset, day, hour = 10, minute = 15, base = new Date()) {
  const year = base.getFullYear();
  const month = base.getMonth() + monthOffset;
  const dim = new Date(year, month + 1, 0).getDate();
  let safeDay = Math.min(day, dim);
  if (monthOffset === 0) safeDay = Math.min(safeDay, base.getDate());
  const local = new Date(year, month, safeDay, hour, minute, 0, 0);
  return {
    date: local.toISOString(),
    bookDate: todayISO(local),
  };
}

export function formatDay(value) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatClock(value) {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
