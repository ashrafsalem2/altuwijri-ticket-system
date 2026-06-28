import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { EmployeeTicketReport, TaskListItem, CountByLabel, WorkTaskStatus, TaskPriority } from '../../core/models/models';
import { PieChart, PieSlice } from '../../shared/pie-chart';

const STATUS_COLORS: Record<string, string> = {
  Backlog: '#64748b', ToDo: '#3b82f6', InProgress: '#f59e0b',
  InReview: '#8b5cf6', Blocked: '#ef4444', Done: '#22c55e', Cancelled: '#9ca3af'
};
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444'
};

@Component({
  selector: 'app-my-reports',
  imports: [FormsModule, DatePipe, RouterLink, PieChart, TranslatePipe],
  styleUrl: './my-reports.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header no-print">
      <h2>{{ 'rep.myTitle' | t }}</h2>
      @if (report()) {
        <button class="btn btn-primary" (click)="print()">🖨 {{ 'c.print' | t }}</button>
      }
    </div>

    <!-- Controls -->
    <div class="card card-pad no-print">
      <div class="ctrl-row">
        <div class="seg-btn-group">
          <button [class.active]="mode() === 'all'" (click)="setMode('all')">{{ 'rep.allTickets' | t }}</button>
          <button [class.active]="mode() === 'period'" (click)="setMode('period')">{{ 'rep.byPeriod' | t }}</button>
          <button [class.active]="mode() === 'single'" (click)="setMode('single')">{{ 'rep.singleTicket' | t }}</button>
        </div>

        @if (mode() === 'period') {
          <div class="date-range">
            <label>From</label>
            <input class="input" type="date" [(ngModel)]="from" />
            <label>To</label>
            <input class="input" type="date" [(ngModel)]="to" />
          </div>
        }

        @if (mode() === 'single') {
          <div class="ticket-pick">
            <select class="input" [(ngModel)]="selectedTicketId">
              <option [ngValue]="null">{{ 'rep.selectTicket' | t }}</option>
              @for (t of allTickets(); track t.id) {
                <option [ngValue]="t.id">#{{ t.id }} {{ t.title }}</option>
              }
            </select>
          </div>
        }

        <button class="btn btn-primary" (click)="generate()" [disabled]="loading()">
          {{ loading() ? ('rep.loading' | t) : ('rep.generate' | t) }}
        </button>
      </div>
      @if (error()) { <div class="err">{{ error() }}</div> }
    </div>

    <!-- Report sheet -->
    @if (report()) {
      <div class="report-sheet card">
        <!-- Header -->
        <div class="rep-head">
          <div class="rep-brand"><span class="logo-mark">{{ 'app.short' | t }}</span><span class="rep-sys">{{ 'app.name' | t }}</span></div>
          <div class="rep-meta">
            <h1 class="rep-title">{{ reportTitle() }}</h1>
            <div class="text-sm muted">
              {{ report()!.fullName }}
              @if (report()!.branchName) { · Branch: {{ report()!.branchName }} }
            </div>
            @if (report()!.from || report()!.to) {
              <div class="text-sm muted">
                Period: {{ report()!.from ? (report()!.from | date:'mediumDate') : '—' }}
                → {{ report()!.to ? (report()!.to | date:'mediumDate') : '—' }}
              </div>
            }
            <div class="text-xs muted">Generated: {{ report()!.generatedAt | date:'medium' }}</div>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="kpi-grid">
          <div class="kpi"><span class="kv">{{ report()!.stats.total }}</span><span class="kl">{{ 'rep.totalLbl' | t }}</span></div>
          <div class="kpi"><span class="kv text-blue">{{ report()!.stats.open }}</span><span class="kl">{{ 'rep.openLbl' | t }}</span></div>
          <div class="kpi"><span class="kv text-amber">{{ report()!.stats.inProgress }}</span><span class="kl">{{ 'rep.inProgLbl' | t }}</span></div>
          <div class="kpi"><span class="kv text-green">{{ report()!.stats.completed }}</span><span class="kl">{{ 'rep.completedLbl' | t }}</span></div>
          <div class="kpi"><span class="kv text-green">{{ report()!.stats.completionRate }}%</span><span class="kl">{{ 'rep.rateLbl' | t }}</span></div>
        </div>

        @if (mode() !== 'single' && report()!.tickets.length > 0) {
          <!-- Charts -->
          <div class="section-title">Distribution</div>
          <div class="pies no-break">
            <div class="pie-card">
              <div class="pie-label">By Status</div>
              <app-pie-chart [data]="statusPie()" [size]="140" [thickness]="22" />
            </div>
            <div class="pie-card">
              <div class="pie-label">By Priority</div>
              <app-pie-chart [data]="priorityPie()" [size]="140" [thickness]="22" />
            </div>
          </div>
        }

        <!-- Ticket Table -->
        <div class="section-title">
          {{ mode() === 'single' ? ('rep.ticketDetail' | t) : ('rep.tickets' | t) }}
        </div>

        @if (displayTickets().length > 0) {
          <table class="rep-table">
            <thead><tr>
              <th>#</th><th>Title</th><th>Priority</th><th>Status</th><th>Progress</th>
              <th>Technician</th><th>Started</th>
            </tr></thead>
            <tbody>
              @for (t of displayTickets(); track t.id) {
                <tr>
                  <td class="mono text-sm">{{ t.id }}</td>
                  <td><a [routerLink]="['/tasks', t.id]" class="print-link">{{ t.title }}</a></td>
                  <td><span class="prio-badge" [style.background]="prioBg(t.priority)">{{ t.priority }}</span></td>
                  <td><span class="st-badge" [class]="'st-' + t.status">{{ stLbl(t.status) }}</span></td>
                  <td>
                    <div class="prog-cell">
                      <div class="pb-wrap"><div class="pb-fill" [style.width.%]="t.progress"></div></div>
                      <span>{{ t.progress }}%</span>
                    </div>
                  </td>
                  <td class="text-sm">{{ t.assigneeName ?? '—' }}</td>
                  <td class="text-sm">{{ t.startDate ? (t.startDate | date:'shortDate') : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="empty">{{ 'rep.noTickets' | t }}</div>
        }

        <div class="rep-foot text-xs muted">
          {{ 'app.confidential' | t }} · {{ 'rep.generated' | t }} {{ report()!.generatedAt | date:'short' }}
        </div>
      </div>
    }
  </div>
  `
})
export class MyReports implements OnInit {
  private reportSvc = inject(ReportService);
  private auth = inject(AuthService);
  i18n = inject(I18nService);

  report = signal<EmployeeTicketReport | null>(null);
  allTickets = signal<TaskListItem[]>([]);
  loading = signal(false);
  error = signal('');
  mode = signal<'all' | 'period' | 'single'>('all');
  from = '';
  to = '';
  selectedTicketId: number | null = null;

  ngOnInit() { this.generate(); }

  setMode(m: 'all' | 'period' | 'single') {
    this.mode.set(m);
    if (m !== 'period') { this.from = ''; this.to = ''; }
    if (m !== 'single') this.selectedTicketId = null;
  }

  generate() {
    this.loading.set(true);
    this.error.set('');
    const f = this.mode() === 'period' ? this.from : undefined;
    const t = this.mode() === 'period' ? this.to : undefined;
    this.reportSvc.myTickets(f || undefined, t || undefined).subscribe({
      next: r => {
        this.report.set(r);
        this.allTickets.set(r.tickets);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load report. Please try again.'); this.loading.set(false); }
    });
  }

  print() { window.print(); }

  reportTitle = computed(() => {
    const m = this.mode();
    if (m === 'all') return this.i18n.t('rep.allTickets');
    if (m === 'period') return this.i18n.t('rep.byPeriod');
    return this.i18n.t('rep.singleTicket');
  });

  displayTickets = computed(() => {
    const r = this.report();
    if (!r) return [];
    if (this.mode() === 'single' && this.selectedTicketId)
      return r.tickets.filter(t => t.id === this.selectedTicketId);
    return r.tickets;
  });

  statusPie = computed((): PieSlice[] =>
    (this.report()?.breakdown.byStatus ?? []).map(c => ({ label: c.label, count: c.count, color: STATUS_COLORS[c.label] }))
  );
  priorityPie = computed((): PieSlice[] =>
    (this.report()?.breakdown.byPriority ?? []).map(c => ({ label: c.label, count: c.count, color: PRIORITY_COLORS[c.label] }))
  );

  stLbl = (s: WorkTaskStatus) => s.replace(/([A-Z])/g, ' $1').trim();
  prioBg = (p: TaskPriority) => PRIORITY_COLORS[p] ?? '#64748b';
}
