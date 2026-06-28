import { Component, Input, computed, signal } from '@angular/core';
import { TaskListItem } from '../core/models/models';

interface CalDay {
  date: Date;
  current: boolean;
  isToday: boolean;
  taskCount: number;
}

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

@Component({
  selector: 'app-mini-calendar',
  standalone: true,
  styles: [`
    .mcal { font-size: .82rem; }
    .mcal-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:.4rem; }
    .mcal-nav button { background:none; border:none; cursor:pointer; font-size:1rem; color:var(--text-muted); padding:.1rem .3rem; border-radius:var(--radius-sm); }
    .mcal-nav button:hover { background:var(--surface-2); color:var(--text); }
    .mcal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; }
    .mcal-dow { text-align:center; font-size:.65rem; font-weight:700; color:var(--text-muted); padding:.25rem 0; }
    .mcal-day {
      display:flex; flex-direction:column; align-items:center; padding:.25rem 0;
      cursor:pointer; border-radius:var(--radius-sm); min-height:32px;
      &:hover { background:var(--surface-2); }
    }
    .mcal-day span { font-size:.75rem; }
    .mcal-day.today span { background:var(--primary); color:#fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-weight:700; }
    .mcal-day.other { opacity:.38; }
    .mcal-dot { width:5px; height:5px; border-radius:50%; background:var(--primary); margin-top:1px; }
  `],
  template: `
    <div class="mcal">
      <div class="mcal-nav">
        <button (click)="prev()">‹</button>
        <strong>{{ monthLabel() }}</strong>
        <button (click)="next()">›</button>
      </div>
      <div class="mcal-grid">
        @for (d of dowLabels; track d) {
          <span class="mcal-dow">{{ d }}</span>
        }
        @for (d of days(); track d.date.toISOString()) {
          <div class="mcal-day" [class.today]="d.isToday" [class.other]="!d.current" (click)="selectDay(d)">
            <span>{{ d.date.getDate() }}</span>
            @if (d.taskCount > 0) { <span class="mcal-dot"></span> }
          </div>
        }
      </div>
    </div>
  `
})
export class MiniCalendar {
  @Input() tasks: TaskListItem[] = [];

  dowLabels = DOW_LABELS;
  private cursor = signal(new Date());

  monthLabel = computed(() => this.cursor().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));

  days = computed((): CalDay[] => {
    const c = this.cursor();
    const year = c.getFullYear(), month = c.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const today = new Date(); today.setHours(0,0,0,0);

    const tasksByDate = new Map<string, number>();
    for (const t of (this.tasks ?? [])) {
      if (!t.startDate) continue;
      const key = new Date(t.startDate).toDateString();
      tasksByDate.set(key, (tasksByDate.get(key) ?? 0) + 1);
    }

    const result: CalDay[] = [];
    // Pad before
    for (let i = 0; i < first.getDay(); i++) {
      const d = new Date(year, month, -first.getDay() + i + 1);
      result.push({ date: d, current: false, isToday: false, taskCount: 0 });
    }
    // Current month days
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d);
      const isToday = date.toDateString() === today.toDateString();
      result.push({ date, current: true, isToday, taskCount: tasksByDate.get(date.toDateString()) ?? 0 });
    }
    // Pad after to fill 6 rows
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      result.push({ date: d, current: false, isToday: false, taskCount: 0 });
    }
    return result;
  });

  prev() { const c = this.cursor(); this.cursor.set(new Date(c.getFullYear(), c.getMonth() - 1, 1)); }
  next() { const c = this.cursor(); this.cursor.set(new Date(c.getFullYear(), c.getMonth() + 1, 1)); }
  selectDay(_d: CalDay) { /* noop: mini calendar is read-only display */ }
}
