import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TaskListItem } from '../../core/models/models';

interface CalDay {
  date: Date;
  isoDate: string;
  current: boolean;
  isToday: boolean;
  tasks: TaskListItem[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [RouterLink, DatePipe],
  styleUrl: './calendar.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header">
      <h2>📅 {{ i18n.lang() === 'ar' ? 'التقويم' : 'Calendar' }}</h2>
    </div>
    <div class="cal-layout">
      <!-- Month calendar -->
      <div class="cal-main card">
        <div class="cal-nav card-pad">
          <button class="btn btn-ghost btn-sm" (click)="prevMonth()">
            {{ i18n.lang() === 'ar' ? '› السابق' : '‹ Prev' }}
          </button>
          <h3>{{ monthLabel() }}</h3>
          <button class="btn btn-sm" (click)="goToday()">
            {{ i18n.lang() === 'ar' ? 'اليوم' : 'Today' }}
          </button>
          <button class="btn btn-ghost btn-sm" (click)="nextMonth()">
            {{ i18n.lang() === 'ar' ? 'التالي ‹' : 'Next ›' }}
          </button>
        </div>
        @if (loading()) {
          <div class="spin"></div>
        } @else {
          <div class="cal-grid">
            @for (dow of dows(); track dow) { <div class="cal-dow">{{ dow }}</div> }
            @for (d of days(); track d.isoDate) {
              <div class="cal-cell" [class.today]="d.isToday" [class.other-month]="!d.current"
                   [class.selected]="selectedIso() === d.isoDate" (click)="select(d)">
                <span class="cal-num">{{ d.date.getDate() }}</span>
                <div class="cal-dots">
                  @for (t of d.tasks.slice(0,3); track t.id) {
                    <span class="cal-task-dot" [class]="'prio-dot-' + t.priority" [title]="t.title"></span>
                  }
                  @if (d.tasks.length > 3) { <span class="cal-more">+{{ d.tasks.length - 3 }}</span> }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Side panel -->
      <div class="cal-side">
        <div class="card card-pad">
          <h4>{{ selectedLabel() }}</h4>
          @if (selectedTasks().length === 0) {
            <div class="empty text-sm">
              {{ i18n.lang() === 'ar' ? 'لا مهام في هذا اليوم' : 'No tasks started this day' }}
            </div>
          } @else {
            @for (t of selectedTasks(); track t.id) {
              <a [routerLink]="['/tasks', t.id]" class="cal-task-row">
                <div class="tr-left">
                  <span class="prio-dot" [style.background]="prioBg(t.priority)"></span>
                  <div>
                    <div class="cal-task-title">{{ t.title }}</div>
                    <div class="text-xs muted">#{{ t.id }} · {{ t.branchName }}</div>
                  </div>
                </div>
                <span class="badge" [class]="'st-' + t.status">{{ t.status }}</span>
              </a>
            }
          }
        </div>

        <!-- In-progress tasks -->
        <div class="card card-pad">
          <h4>⏱ {{ i18n.lang() === 'ar' ? 'قيد التنفيذ' : 'In Progress' }}</h4>
          @for (t of inProgressTasks().slice(0,5); track t.id) {
            <a [routerLink]="['/tasks', t.id]" class="cal-task-row">
              <div class="tr-left">
                <span class="prio-dot" [style.background]="prioBg(t.priority)"></span>
                <div>
                  <div class="cal-task-title">{{ t.title }}</div>
                  <div class="text-xs muted">
                    @if (t.startDate) {
                      {{ i18n.lang() === 'ar' ? 'بدأت:' : 'Started:' }}
                      {{ t.startDate | date:'mediumDate' }}
                    }
                  </div>
                </div>
              </div>
              <span class="badge st-InProgress">{{ i18n.lang() === 'ar' ? 'نشط' : 'Active' }}</span>
            </a>
          } @empty {
            <div class="empty text-sm">{{ i18n.lang() === 'ar' ? 'لا مهام نشطة' : 'No active tasks' }}</div>
          }
        </div>
      </div>
    </div>
  </div>
  `
})
export class CalendarPage implements OnInit {
  private taskSvc = inject(TaskService);
  private auth = inject(AuthService);
  i18n = inject(I18nService);

  private locale = computed(() => this.i18n.lang() === 'ar' ? 'ar-SA' : 'en-GB');

  dows = computed(() =>
    // Jan 7 2024 = Sunday; i=0..6 gives Sun..Sat
    Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(this.locale(), { weekday: 'short' }).format(new Date(2024, 0, 7 + i))
    )
  );

  loading = signal(true);
  allTasks = signal<TaskListItem[]>([]);
  private cursor = signal(new Date());
  selectedIso = signal('');

  monthLabel = computed(() =>
    this.cursor().toLocaleDateString(this.locale(), { month: 'long', year: 'numeric' })
  );

  private tasksByDate = computed(() => {
    const map = new Map<string, TaskListItem[]>();
    for (const t of this.allTasks()) {
      if (!t.startDate) continue;
      const key = this.toIso(new Date(t.startDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  });

  days = computed((): CalDay[] => {
    const c = this.cursor();
    const year = c.getFullYear(), month = c.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const todayStr = this.toIso(new Date());
    const byDate = this.tasksByDate();
    const result: CalDay[] = [];

    for (let i = 0; i < first.getDay(); i++) {
      const date = new Date(year, month, -first.getDay() + i + 1);
      result.push({ date, isoDate: this.toIso(date), current: false, isToday: false, tasks: [] });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = this.toIso(date);
      result.push({ date, isoDate: iso, current: true, isToday: iso === todayStr, tasks: byDate.get(iso) ?? [] });
    }
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      result.push({ date, isoDate: this.toIso(date), current: false, isToday: false, tasks: [] });
    }
    return result;
  });

  selectedLabel = computed(() => {
    if (!this.selectedIso()) return this.i18n.lang() === 'ar' ? 'اختر يوماً' : 'Select a day';
    const [y, m, d] = this.selectedIso().split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(this.locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  });

  selectedTasks = computed(() => {
    const iso = this.selectedIso();
    if (!iso) return [];
    return this.tasksByDate().get(iso) ?? [];
  });

  inProgressTasks = computed(() =>
    this.allTasks()
      .filter(t => t.status === 'InProgress' || t.status === 'InReview' || t.status === 'Blocked')
      .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
  );

  ngOnInit() {
    this.selectedIso.set(this.toIso(new Date()));
    this.taskSvc.query({ pageSize: 500, sortDescending: true }).subscribe({
      next: r => { this.allTasks.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  prevMonth() { const c = this.cursor(); this.cursor.set(new Date(c.getFullYear(), c.getMonth() - 1, 1)); }
  nextMonth() { const c = this.cursor(); this.cursor.set(new Date(c.getFullYear(), c.getMonth() + 1, 1)); }
  goToday() { this.cursor.set(new Date()); this.selectedIso.set(this.toIso(new Date())); }
  select(d: CalDay) { this.selectedIso.set(d.isoDate); }

  prioBg = (p: string) => ({ Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' }[p] ?? '#94a3b8');

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
