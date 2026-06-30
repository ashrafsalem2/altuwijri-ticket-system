import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, ReportService } from '../../core/services/data.services';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import {
  ActivityFeedItem, DashboardCharts, DashboardStats, TaskListItem,
  EmployeeTicketReport, WorkTaskStatus, TaskPriority
} from '../../core/models/models';
import { initials, timeAgo, TYPE_ICONS } from '../../shared/util';
import { MiniCalendar } from '../../shared/mini-calendar';
import { PieChart, PieSlice } from '../../shared/pie-chart';

const STATUS_COLORS: Record<string, string> = {
  Backlog: '#64748b', ToDo: '#3b82f6', InProgress: '#f59e0b',
  InReview: '#8b5cf6', Blocked: '#ef4444', Done: '#22c55e', Cancelled: '#9ca3af'
};
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444'
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TranslatePipe, DatePipe, FormsModule, MiniCalendar, PieChart],
  styleUrl: './dashboard.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">

    <!-- ══ EMPLOYEE DASHBOARD ══ -->
    @if (isEmployee()) {
      <div class="dash-header no-print">
        <div>
          <h2>{{ greeting }}, {{ auth.user()?.fullName?.split(' ')?.[0] }}!</h2>
          <span class="muted text-sm">{{ today | date:'EEEE, MMMM d, y' }}</span>
        </div>
        @if (empReport()) {
          <button class="btn btn-primary no-print" (click)="print()">🖨 {{ 'c.print' | t }}</button>
        }
      </div>

      <!-- Report mode controls -->
      <div class="card card-pad rep-ctrl no-print">
        <div class="ctrl-row">
          <div class="seg-btn-group">
            <button [class.active]="empMode() === 'all'"    (click)="setEmpMode('all')">{{ 'rep.allTickets' | t }}</button>
            <button [class.active]="empMode() === 'period'" (click)="setEmpMode('period')">{{ 'rep.byPeriod' | t }}</button>
            <button [class.active]="empMode() === 'single'" (click)="setEmpMode('single')">{{ 'rep.singleTicket' | t }}</button>
          </div>
          @if (empMode() === 'period') {
            <div class="date-range">
              <label>From</label>
              <input class="input" type="date" [(ngModel)]="empFrom" />
              <label>To</label>
              <input class="input" type="date" [(ngModel)]="empTo" />
            </div>
          }
          @if (empMode() === 'single') {
            <select class="input ticket-pick-sel" [(ngModel)]="empSelectedId">
              <option [ngValue]="null">{{ 'rep.selectTicket' | t }}</option>
              @for (t of empAllTickets(); track t.id) {
                <option [ngValue]="t.id">#{{ t.id }} {{ t.title }}</option>
              }
            </select>
          }
          <button class="btn btn-primary" (click)="generateEmpReport()" [disabled]="empRepLoading()">
            {{ empRepLoading() ? ('rep.loading' | t) : ('rep.generate' | t) }}
          </button>
        </div>
        @if (empError()) { <div class="rep-err-msg">{{ empError() }}</div> }
      </div>

      <!-- Main: report area + sticky calendar -->
      <div class="emp-dash-layout">
        <div class="emp-dash-main">
          @if (empRepLoading() && !empReport()) {
            <div class="spin"></div>
          } @else if (empReport()) {
            <div class="report-sheet card">
              <!-- Report header -->
              <div class="rep-head">
                <div class="rep-brand">
                  <span class="logo-mark">{{ 'app.short' | t }}</span>
                  <span class="rep-sys">{{ 'app.name' | t }}</span>
                </div>
                <div class="rep-meta">
                  <h1 class="rep-title">{{ empReportTitle() }}</h1>
                  <div class="text-sm muted">
                    {{ empReport()!.fullName }}
                    @if (empReport()!.branchName) { · Branch: {{ empReport()!.branchName }} }
                  </div>
                  @if (empReport()!.from || empReport()!.to) {
                    <div class="text-sm muted">
                      Period:
                      {{ empReport()!.from ? (empReport()!.from | date:'mediumDate') : '—' }}
                      → {{ empReport()!.to ? (empReport()!.to | date:'mediumDate') : '—' }}
                    </div>
                  }
                  <div class="text-xs muted">Generated: {{ empReport()!.generatedAt | date:'medium' }}</div>
                </div>
              </div>

              <!-- KPI numbers -->
              <div class="rep-kpi-grid">
                <div class="rep-kpi"><span class="rep-kv">{{ empReport()!.stats.total }}</span><span class="rep-kl">{{ 'rep.totalLbl' | t }}</span></div>
                <div class="rep-kpi"><span class="rep-kv rep-blue">{{ empReport()!.stats.open }}</span><span class="rep-kl">{{ 'rep.openLbl' | t }}</span></div>
                <div class="rep-kpi"><span class="rep-kv rep-amber">{{ empReport()!.stats.inProgress }}</span><span class="rep-kl">{{ 'rep.inProgLbl' | t }}</span></div>
                <div class="rep-kpi"><span class="rep-kv rep-green">{{ empReport()!.stats.completed }}</span><span class="rep-kl">{{ 'rep.completedLbl' | t }}</span></div>
                <div class="rep-kpi"><span class="rep-kv rep-green">{{ empReport()!.stats.completionRate }}%</span><span class="rep-kl">{{ 'rep.rateLbl' | t }}</span></div>
              </div>

              <!-- Pie charts -->
              @if (empMode() !== 'single' && empReport()!.tickets.length > 0) {
                <div class="rep-section-title">Distribution</div>
                <div class="rep-pies">
                  <div class="pie-card">
                    <div class="pie-label">By Status</div>
                    <app-pie-chart [data]="empStatusPie()" [size]="140" [thickness]="22" />
                  </div>
                  <div class="pie-card">
                    <div class="pie-label">By Priority</div>
                    <app-pie-chart [data]="empPriorityPie()" [size]="140" [thickness]="22" />
                  </div>
                </div>
              }

              <!-- Ticket table -->
              <div class="rep-section-title">
                {{ empMode() === 'single' ? ('rep.ticketDetail' | t) : ('rep.tickets' | t) }}
              </div>
              @if (empDisplayTickets().length > 0) {
                <div class="rep-table-wrap">
                  <table class="rep-table">
                    <thead><tr>
                      <th>#</th><th>Title</th><th>Priority</th><th>Status</th>
                      <th>Progress</th><th>Technician</th><th>Started</th>
                    </tr></thead>
                    <tbody>
                      @for (t of empDisplayTickets(); track t.id) {
                        <tr>
                          <td class="mono text-sm">{{ t.id }}</td>
                          <td><a [routerLink]="['/tasks', t.id]" class="rep-link">{{ t.title }}</a></td>
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
                </div>
              } @else {
                <div class="empty text-sm">{{ 'rep.noTickets' | t }}</div>
              }

              <div class="rep-foot text-xs muted">
                {{ 'app.confidential' | t }} · {{ 'rep.generated' | t }} {{ empReport()!.generatedAt | date:'short' }}
              </div>
            </div>
          }
        </div>

        <!-- Sticky calendar sidebar -->
        <div class="emp-dash-side no-print">
          <div class="card card-pad mini-cal-card emp-cal-sticky">
            <app-mini-calendar [tasks]="empAllTickets()"></app-mini-calendar>
          </div>
        </div>
      </div>

    <!-- ══ TECHNICIAN DASHBOARD ══ -->
    } @else if (isTechnician()) {
      <div class="dash-header no-print">
        <div>
          <h2>{{ greeting }}, {{ auth.user()?.fullName?.split(' ')?.[0] }}!</h2>
          <span class="muted text-sm">{{ today | date:'EEEE, MMMM d, y' }}</span>
        </div>
      </div>
      @if (techLoading()) { <div class="spin"></div> } @else {
        <div class="kpi-grid">
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id}" class="kpi-card">
            <div class="kpi-icon" style="background:#dbeafe;color:#1d4ed8">🎫</div>
            <div class="kpi-body"><div class="kpi-val">{{ techStats().total }}</div><div class="kpi-lbl">{{ 'dash.techTotal' | t }}</div></div>
          </a>
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id, statuses: ['Backlog','ToDo']}" class="kpi-card">
            <div class="kpi-icon" style="background:#ede9fe;color:#7c3aed">📋</div>
            <div class="kpi-body"><div class="kpi-val">{{ techStats().open }}</div><div class="kpi-lbl">{{ 'dash.techOpen' | t }}</div></div>
          </a>
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id, statuses: ['InProgress','Blocked','InReview']}" class="kpi-card">
            <div class="kpi-icon" style="background:#cffafe;color:#0e7490">⚙️</div>
            <div class="kpi-body"><div class="kpi-val">{{ techStats().inProgress }}</div><div class="kpi-lbl">{{ 'dash.techInProg' | t }}</div></div>
          </a>
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id, status: 'Done'}" class="kpi-card">
            <div class="kpi-icon" style="background:#dcfce7;color:#15803d">✅</div>
            <div class="kpi-body"><div class="kpi-val">{{ techStats().done }}</div><div class="kpi-lbl">{{ 'dash.techDone' | t }}</div></div>
          </a>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#f0fdf4;color:#15803d">📈</div>
            <div class="kpi-body"><div class="kpi-val">{{ techStats().rate }}%</div><div class="kpi-lbl">{{ 'dash.techRate' | t }}</div></div>
          </div>
        </div>
        <div class="dash-bottom">
          <div class="card card-pad activity-card">
            <h4>{{ 'dash.techRecent' | t }}</h4>
            @for (t of techTasks().slice(0, 10); track t.id) {
              <a [routerLink]="['/tasks', t.id]" class="ticket-row">
                <div class="tr-left">
                  <span class="prio-dot" [style.background]="prioBg(t.priority)"></span>
                  <div>
                    <div class="tr-title">{{ t.title }}</div>
                    <div class="text-xs muted">#{{ t.id }}@if (t.startDate) { · {{ t.startDate | date:'mediumDate' }} }</div>
                  </div>
                </div>
                <span class="badge" [class]="'st-' + t.status">{{ t.status }}</span>
              </a>
            } @empty {
              <div class="empty text-sm">No assigned tickets.</div>
            }
          </div>
          <div class="dash-bottom-right">
            <div class="card card-pad mini-cal-card">
              <app-mini-calendar [tasks]="techTasks()"></app-mini-calendar>
            </div>
          </div>
        </div>
      }

    <!-- ══ ADMIN DASHBOARD ══ -->
    } @else {
      <div class="dash-header no-print">
        <div>
          <h2>{{ greeting }}, {{ auth.user()?.fullName?.split(' ')?.[0] }}!</h2>
          <span class="muted text-sm">{{ today | date:'EEEE, MMMM d, y' }}</span>
        </div>
      </div>
      @if (loading()) { <div class="spin"></div> } @else {
        <div class="kpi-grid">
          <a [routerLink]="['/tasks']" class="kpi-card">
            <div class="kpi-icon" style="background:#dbeafe;color:#1d4ed8">🎫</div>
            <div class="kpi-body"><div class="kpi-val">{{ stats()?.totalTasks }}</div><div class="kpi-lbl">{{ 'dash.total' | t }}</div></div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{statuses: ['Backlog','ToDo','InProgress','InReview','Blocked']}" class="kpi-card">
            <div class="kpi-icon" style="background:#ede9fe;color:#7c3aed">📬</div>
            <div class="kpi-body"><div class="kpi-val">{{ stats()?.openTasks }}</div><div class="kpi-lbl">{{ 'dash.open' | t }}</div></div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{status:'InProgress'}" class="kpi-card">
            <div class="kpi-icon" style="background:#cffafe;color:#0e7490">⚙️</div>
            <div class="kpi-body"><div class="kpi-val">{{ stats()?.inProgressTasks }}</div><div class="kpi-lbl">{{ 'dash.inProgress' | t }}</div></div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{status:'Done'}" class="kpi-card">
            <div class="kpi-icon" style="background:#dcfce7;color:#15803d">✅</div>
            <div class="kpi-body"><div class="kpi-val">{{ stats()?.completedTasks }}</div><div class="kpi-lbl">{{ 'dash.done' | t }}</div></div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{assigneeId: auth.user()?.id}" class="kpi-card">
            <div class="kpi-icon" style="background:#e0e7ff;color:#4338ca">👤</div>
            <div class="kpi-body"><div class="kpi-val">{{ stats()?.myOpenTasks }}</div><div class="kpi-lbl">{{ 'dash.mine' | t }}</div></div>
          </a>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#f0fdfa;color:#0f766e">📈</div>
            <div class="kpi-body"><div class="kpi-val">{{ stats()?.completionRate }}%</div><div class="kpi-lbl">{{ 'dash.rate' | t }}</div></div>
          </div>
        </div>

        <div class="dash-main">
          <div class="card card-pad chart-card">
            <div class="chart-header"><h4>{{ 'dash.last7' | t }}</h4></div>
            @if (charts()?.completedLast7Days?.length) {
              <svg class="line-chart" viewBox="0 0 480 160" preserveAspectRatio="none">
                <line x1="40" y1="20" x2="460" y2="20" stroke="var(--border)" stroke-width="1"/>
                <line x1="40" y1="57" x2="460" y2="57" stroke="var(--border)" stroke-width="1"/>
                <line x1="40" y1="94" x2="460" y2="94" stroke="var(--border)" stroke-width="1"/>
                <line x1="40" y1="130" x2="460" y2="130" stroke="var(--border)" stroke-width="1"/>
                <path [attr.d]="areaPath()" fill="var(--primary)" fill-opacity="0.12"/>
                <path [attr.d]="linePath()" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
                @for (pt of chartPoints(); track pt.i) {
                  <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4" fill="var(--primary)" stroke="var(--surface)" stroke-width="2"/>
                  <text [attr.x]="pt.x" y="152" text-anchor="middle" font-size="9" fill="var(--text-muted)">{{ pt.label }}</text>
                }
              </svg>
              <p class="chart-hint">Completed tickets per day</p>
            } @else {
              <div class="empty text-sm">No data</div>
            }
          </div>
          <div class="side-panel">
            <div class="card card-pad">
              <h4>{{ 'dash.byStatus' | t }}</h4>
              @for (c of charts()?.byStatus; track c.label) {
                <a class="bar-row" [routerLink]="['/tasks']" [queryParams]="{status: c.label}" style="text-decoration:none;color:inherit;cursor:pointer;border-radius:var(--radius-sm);">
                  <span class="bar-lbl">{{ c.label }}</span>
                  <div class="bar"><div class="bar-fill" [style.width.%]="pct(c.count, maxStatus())"></div></div>
                  <span class="bar-val">{{ c.count }}</span>
                </a>
              }
            </div>
            <div class="card card-pad">
              <h4>{{ 'dash.byPriority' | t }}</h4>
              @for (c of charts()?.byPriority; track c.label) {
                <a class="bar-row" [routerLink]="['/tasks']" [queryParams]="{priority: c.label}" style="text-decoration:none;color:inherit;cursor:pointer;border-radius:var(--radius-sm);">
                  <span class="bar-lbl">{{ c.label }}</span>
                  <div class="bar"><div class="bar-fill" [class]="'pf-' + c.label" [style.width.%]="pct(c.count, maxPrio())"></div></div>
                  <span class="bar-val">{{ c.count }}</span>
                </a>
              }
            </div>
          </div>
        </div>

        <div class="dash-bottom">
          <div class="card card-pad activity-card">
            <h4>{{ 'dash.activity' | t }}</h4>
            @for (a of activity(); track a.id) {
              <div class="act-row">
                <span class="avatar" [style.background]="'#64748b'">{{ ini(a.userName) }}</span>
                <div class="act-body">
                  <span><strong>{{ a.userName || 'System' }}</strong> {{ a.action }}
                    @if (a.field) { <span class="muted">({{ a.oldValue }} → {{ a.newValue }})</span> }
                    on <a [routerLink]="['/tasks', a.taskId]">{{ a.taskTitle }}</a>
                  </span>
                  <span class="text-xs muted">{{ ago(a.createdAt) }}</span>
                </div>
              </div>
            } @empty { <div class="empty text-sm">No recent activity</div> }
          </div>
          <div class="dash-bottom-right">
            <div class="card card-pad">
              <h4>{{ 'dash.typeDist' | t }}</h4>
              <div class="type-grid">
                @for (c of charts()?.byType; track c.label) {
                  <a class="type-cell" [routerLink]="['/tasks']" [queryParams]="{type: c.label}">
                    <span class="type-icon">{{ typeIcon(c.label) }}</span>
                    <span class="type-count">{{ c.count }}</span>
                    <span class="type-lbl">{{ c.label }}</span>
                  </a>
                }
              </div>
            </div>
            <div class="card card-pad mini-cal-card">
              <app-mini-calendar [tasks]="[]"></app-mini-calendar>
            </div>
          </div>
        </div>
      }
    }
  </div>
  `
})
export class Dashboard implements OnInit {
  private svc    = inject(DashboardService);
  private repSvc = inject(ReportService);
  private taskSvc = inject(TaskService);
  private router = inject(Router);
  auth = inject(AuthService);
  i18n = inject(I18nService);

  isEmployee   = computed(() => this.auth.hasRole('Branch-Employee', 'HO-Employee', 'Cam-Employee'));
  isTechnician = computed(() => this.auth.hasRole('Technician'));

  // ── Employee report ────────────────────────────────────────────────
  empReport      = signal<EmployeeTicketReport | null>(null);
  empAllTickets  = signal<TaskListItem[]>([]);
  empRepLoading  = signal(false);
  empError       = signal('');
  empMode        = signal<'all' | 'period' | 'single'>('all');
  empFrom        = '';
  empTo          = '';
  empSelectedId: number | null = null;

  setEmpMode(m: 'all' | 'period' | 'single') {
    this.empMode.set(m);
    if (m !== 'period') { this.empFrom = ''; this.empTo = ''; }
    if (m !== 'single') this.empSelectedId = null;
  }

  generateEmpReport() {
    this.empRepLoading.set(true);
    this.empError.set('');
    const f = this.empMode() === 'period' ? this.empFrom || undefined : undefined;
    const t = this.empMode() === 'period' ? this.empTo || undefined : undefined;
    this.repSvc.myTickets(f, t).subscribe({
      next: r => { this.empReport.set(r); this.empAllTickets.set(r.tickets); this.empRepLoading.set(false); },
      error: () => { this.empError.set('Failed to load report.'); this.empRepLoading.set(false); }
    });
  }

  print() { window.print(); }

  empReportTitle = computed(() => {
    const m = this.empMode();
    if (m === 'all')    return this.i18n.t('rep.allTickets');
    if (m === 'period') return this.i18n.t('rep.byPeriod');
    return this.i18n.t('rep.singleTicket');
  });

  empDisplayTickets = computed(() => {
    const r = this.empReport();
    if (!r) return [];
    if (this.empMode() === 'single' && this.empSelectedId)
      return r.tickets.filter(t => t.id === this.empSelectedId);
    return r.tickets;
  });

  empStatusPie = computed((): PieSlice[] =>
    (this.empReport()?.breakdown.byStatus ?? []).map(c => ({ label: c.label, count: c.count, color: STATUS_COLORS[c.label] }))
  );
  empPriorityPie = computed((): PieSlice[] =>
    (this.empReport()?.breakdown.byPriority ?? []).map(c => ({ label: c.label, count: c.count, color: PRIORITY_COLORS[c.label] }))
  );

  stLbl = (s: WorkTaskStatus) => s.replace(/([A-Z])/g, ' $1').trim();

  // ── Technician ─────────────────────────────────────────────────────
  techTasks   = signal<TaskListItem[]>([]);
  techLoading = signal(true);
  techStats = computed(() => {
    const list = this.techTasks();
    const done = list.filter(t => t.status === 'Done').length;
    const total = list.length;
    return {
      total,
      open: list.filter(t => t.status === 'Backlog' || t.status === 'ToDo').length,
      inProgress: list.filter(t => t.status === 'InProgress' || t.status === 'Blocked' || t.status === 'InReview').length,
      done,
      rate: total > 0 ? Math.round((done / total) * 100) : 0
    };
  });

  // ── Admin ──────────────────────────────────────────────────────────
  stats    = signal<DashboardStats | null>(null);
  charts   = signal<DashboardCharts | null>(null);
  activity = signal<ActivityFeedItem[]>([]);
  loading  = signal(true);

  ini = initials; ago = timeAgo;
  typeIcon = (t: string) => (TYPE_ICONS as Record<string, string>)[t] ?? '📋';
  prioBg   = (p: string) => ({ Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' }[p] ?? '#94a3b8');

  maxStatus = computed(() => Math.max(1, ...(this.charts()?.byStatus ?? []).map(c => c.count)));
  maxPrio   = computed(() => Math.max(1, ...(this.charts()?.byPriority ?? []).map(c => c.count)));

  private readonly PAD_L = 40; private readonly PAD_R = 20; private readonly PAD_T = 20; private readonly PAD_B = 30;
  private readonly W = 480; private readonly H = 160;

  chartPoints = computed(() => {
    const data = this.charts()?.completedLast7Days ?? [];
    if (!data.length) return [];
    const chartW = this.W - this.PAD_L - this.PAD_R;
    const chartH = this.H - this.PAD_T - this.PAD_B;
    const maxV = Math.max(1, ...data.map(d => d.count));
    return data.map((d, i) => ({
      i,
      x: this.PAD_L + (i / Math.max(data.length - 1, 1)) * chartW,
      y: this.PAD_T + (1 - d.count / maxV) * chartH,
      label: d.label, count: d.count
    }));
  });

  linePath = computed(() => {
    const pts = this.chartPoints();
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y} ${cx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    return d;
  });

  areaPath = computed(() => {
    const pts = this.chartPoints();
    if (pts.length < 2) return '';
    const bottom = this.H - this.PAD_B;
    let d = `M ${pts[0].x} ${bottom} L ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y} ${cx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${bottom} Z`;
    return d;
  });

  get greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }
  today = new Date();

  ngOnInit() {
    if (this.isEmployee()) {
      this.generateEmpReport();
    } else if (this.isTechnician()) {
      const uid = this.auth.user()?.id;
      if (uid) {
        this.taskSvc.query({ assigneeId: uid, sortDescending: true, pageSize: 500 }).subscribe({
          next: r => { this.techTasks.set(r.items); this.techLoading.set(false); },
          error: () => this.techLoading.set(false)
        });
      } else {
        this.techLoading.set(false);
      }
    } else {
      this.svc.stats().subscribe(s => { this.stats.set(s); this.loading.set(false); });
      this.svc.charts().subscribe(c => this.charts.set(c));
      this.svc.activity(15).subscribe(a => this.activity.set(a));
    }
  }

  pct(v: number, max: number) { return Math.round((v / max) * 100); }
  filterByStatus(label: string) { this.router.navigate(['/tasks'], { queryParams: { status: label } }); }
  filterByPriority(label: string) { this.router.navigate(['/tasks'], { queryParams: { priority: label } }); }
  filterByType(label: string) { this.router.navigate(['/tasks'], { queryParams: { type: label } }); }
}
