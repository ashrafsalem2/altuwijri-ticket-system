import type { TaskType } from '../core/models/models';

/** Icon emoji for each task/ticket type. */
export const TYPE_ICONS: Record<TaskType, string> = {
  Task: '📋', Bug: '🐛', Incident: '🚨', ServiceRequest: '🎫',
  Feature: '⭐', Maintenance: '🔧', Change: '🔄'
};

/** Type icon with fallback. */
export function typeIcon(t: TaskType | undefined): string { return t ? TYPE_ICONS[t] : '📋'; }

// ── Working-hours helpers (09:00–18:00, every day) ──────────────────────────

const WH_START = 9;  // 9 AM
const WH_END   = 18; // 6 PM
const WH_MINS_PER_DAY = (WH_END - WH_START) * 60; // 540 min

/** Count working minutes between two dates (9 AM–6 PM every day). */
function workingMins(from: Date, to: Date): number {
  if (from >= to) return 0;
  let mins = 0;
  const cur = new Date(from);

  // Advance cursor into working hours if it starts outside them
  const snapIn = (d: Date) => {
    const hm = d.getHours() * 60 + d.getMinutes();
    if (hm < WH_START * 60) {
      d.setHours(WH_START, 0, 0, 0);
    } else if (hm >= WH_END * 60) {
      d.setDate(d.getDate() + 1);
      d.setHours(WH_START, 0, 0, 0);
    }
  };
  snapIn(cur);

  while (cur < to) {
    const eod = new Date(cur);
    eod.setHours(WH_END, 0, 0, 0);
    const until = to < eod ? to : eod;
    const delta = (until.getTime() - cur.getTime()) / 60000;
    if (delta > 0) mins += delta;
    if (until >= eod) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(WH_START, 0, 0, 0);
    } else break;
  }
  return mins;
}

function fmtWorkMins(m: number): string {
  const a = Math.round(Math.abs(m));
  const d = Math.floor(a / WH_MINS_PER_DAY);
  const h = Math.floor((a % WH_MINS_PER_DAY) / 60);
  if (d >= 1) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h >= 1) return `${h}h`;
  return '< 1h';
}

/**
 * Compute ticket lifetime info using working hours (9 AM–6 PM).
 * @param startDate  When work officially began (acceptance/start-work timestamp).
 *                   Falls back to createdAt for the progress bar reference.
 */
export function lifetime(
  dueDate?: string | null,
  status?: string | null,
  createdAt?: string,
  startDate?: string | null,
) {
  if (status === 'Done' || status === 'Cancelled') return { kind: status, label: '', pct: 100, color: '' };
  if (!dueDate) return { kind: 'none', label: '', pct: 0, color: '' };

  const now  = new Date();
  const due  = new Date(dueDate);
  const overdue = now > due;

  const label = overdue
    ? fmtWorkMins(workingMins(due, now))
    : fmtWorkMins(workingMins(now, due));

  // Progress bar: elapsed / total working minutes from start → due
  const ref = startDate ? new Date(startDate) : createdAt ? new Date(createdAt) : null;
  const totalW   = ref ? workingMins(ref, due) : 0;
  const elapsedW = ref ? workingMins(ref, overdue ? due : now) : 0;
  const pct = totalW > 0 ? Math.min(100, Math.max(0, Math.round(elapsedW / totalW * 100))) : overdue ? 100 : 50;

  // Color thresholds in working minutes
  const remW = overdue ? 0 : workingMins(now, due);
  const color = overdue        ? 'red'
    : remW <= 60               ? 'red'    // < 1 working hour
    : remW <= WH_MINS_PER_DAY  ? 'amber'  // < 1 working day
    : remW <= 3 * WH_MINS_PER_DAY ? 'yellow' // < 3 working days
    : 'green';

  return { kind: overdue ? 'overdue' : 'future', label, pct, color };
}

/** Initials from a full name, e.g. "Maya Manager" -> "MM". */
export function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
}

/** Deterministic colour from a string (fallback avatar colour). */
export function colorFor(seed?: string): string {
  const palette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
  if (!seed) return palette[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

/** Human friendly relative time. */
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
