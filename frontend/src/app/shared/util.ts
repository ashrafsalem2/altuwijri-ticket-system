import type { TaskType } from '../core/models/models';

/** Icon emoji for each task/ticket type. */
export const TYPE_ICONS: Record<TaskType, string> = {
  Task: '📋', Bug: '🐛', Incident: '🚨', ServiceRequest: '🎫',
  Feature: '⭐', Maintenance: '🔧', Change: '🔄'
};

/** Type icon with fallback. */
export function typeIcon(t: TaskType | undefined): string { return t ? TYPE_ICONS[t] : '📋'; }

function fmtDuration(from: Date, to: Date): string {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const totalMins = Math.floor(ms / 60000);
  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;
  if (days >= 1) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours >= 1) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  if (totalMins < 1) return '< 1m';
  return `${totalMins}m`;
}

/**
 * Informative elapsed-time counter for a ticket.
 * - pending: work not started yet
 * - running: started, still active — shows elapsed since startDate
 * - done: shows total duration startDate → completedAt
 * - cancelled: no time shown
 */
export function elapsed(
  startDate?: string | null,
  status?: string | null,
  completedAt?: string | null,
): { kind: string; label: string } {
  if (status === 'Done') {
    const label = startDate && completedAt
      ? fmtDuration(new Date(startDate), new Date(completedAt))
      : '';
    return { kind: 'done', label };
  }
  if (status === 'Cancelled') return { kind: 'cancelled', label: '' };
  if (!startDate) return { kind: 'pending', label: '' };
  return { kind: 'running', label: fmtDuration(new Date(startDate), new Date()) };
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
