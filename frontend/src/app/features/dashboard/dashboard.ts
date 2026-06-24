import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/data.services';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { ActivityFeedItem, DashboardCharts, DashboardStats, TaskListItem } from '../../core/models/models';
import { initials, timeAgo, TYPE_ICONS } from '../../shared/util';
import { PieChart, PieSlice } from '../../shared/pie-chart';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PieChart, TranslatePipe, DatePipe],
  styleUrl: './dashboard.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">

    <!-- ══ EMPLOYEE DASHBOARD ══ -->
    @if (isEmployee()) {
      <div class="page-header">
        <h2>{{ 'dash.empTitle' | t }}</h2>
      </div>
      @if (empLoading()) { <div class="spin"></div> } @else {
        <div class="kpis">
          <a routerLink="/my-tickets" class="kpi card card-pad">
            <div class="k-val">{{ empStats().total }}</div>
            <div class="k-lbl">{{ 'dash.myTotal' | t }}</div>
          </a>
          <a routerLink="/my-tickets" [queryParams]="{filter:'notYet'}" class="kpi card card-pad">
            <div class="k-val">{{ empStats().open }}</div>
            <div class="k-lbl">{{ 'dash.myOpen' | t }}</div>
          </a>
          <a routerLink="/my-tickets" [queryParams]="{filter:'open'}" class="kpi card card-pad blue">
            <div class="k-val">{{ empStats().inProgress }}</div>
            <div class="k-lbl">{{ 'dash.myInProg' | t }}</div>
          </a>
          <a routerLink="/my-tickets" [queryParams]="{filter:'complete'}" class="kpi card card-pad green">
            <div class="k-val">{{ empStats().done }}</div>
            <div class="k-lbl">{{ 'dash.myDone' | t }}</div>
          </a>
          <a routerLink="/my-tickets" class="kpi card card-pad red">
            <div class="k-val">{{ empStats().overdue }}</div>
            <div class="k-lbl">{{ 'dash.myOverdue' | t }}</div>
          </a>
          <div class="kpi card card-pad">
            <div class="k-val">{{ empStats().rate }}%</div>
            <div class="k-lbl">{{ 'dash.myRate' | t }}</div>
          </div>
        </div>

        <div class="card card-pad mt-2">
          <h4>{{ 'dash.myRecent' | t }}</h4>
          @for (t of empTickets().slice(0, 8); track t.id) {
            <a [routerLink]="['/tasks', t.id]" class="ticket-row">
              <div class="tr-left">
                <span class="prio-dot" [style.background]="prioBg(t.priority)"></span>
                <div>
                  <div class="tr-title">{{ t.title }}</div>
                  <div class="text-xs muted">#{{ t.id }} · {{ t.dueDate ? (t.dueDate | date:'mediumDate') : ('lt.noDeadline' | t) }}</div>
                </div>
              </div>
              <span class="badge" [class]="'st-' + t.status">{{ t.status }}</span>
            </a>
          } @empty {
            <div class="empty text-sm">{{ 'myt.empty' | t }}</div>
          }
        </div>
      }

    <!-- ══ TECHNICIAN DASHBOARD ══ -->
    } @else if (isTechnician()) {
      <div class="page-header">
        <h2>{{ 'dash.techTitle' | t }}</h2>
      </div>
      @if (techLoading()) { <div class="spin"></div> } @else {
        <div class="kpis">
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id}" class="kpi card card-pad">
            <div class="k-val">{{ techStats().total }}</div>
            <div class="k-lbl">{{ 'dash.techTotal' | t }}</div>
          </a>
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id, statuses: ['Backlog','ToDo']}" class="kpi card card-pad">
            <div class="k-val">{{ techStats().open }}</div>
            <div class="k-lbl">{{ 'dash.techOpen' | t }}</div>
          </a>
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id, statuses: ['InProgress','Blocked','InReview']}" class="kpi card card-pad blue">
            <div class="k-val">{{ techStats().inProgress }}</div>
            <div class="k-lbl">{{ 'dash.techInProg' | t }}</div>
          </a>
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id, status: 'Done'}" class="kpi card card-pad green">
            <div class="k-val">{{ techStats().done }}</div>
            <div class="k-lbl">{{ 'dash.techDone' | t }}</div>
          </a>
          <a routerLink="/tasks" [queryParams]="{assigneeId: auth.user()?.id, overdue: 'true'}" class="kpi card card-pad red">
            <div class="k-val">{{ techStats().overdue }}</div>
            <div class="k-lbl">{{ 'dash.techOverdue' | t }}</div>
          </a>
          <div class="kpi card card-pad">
            <div class="k-val">{{ techStats().rate }}%</div>
            <div class="k-lbl">{{ 'dash.techRate' | t }}</div>
          </div>
        </div>

        <div class="card card-pad mt-2">
          <h4>{{ 'dash.techRecent' | t }}</h4>
          @for (t of techTasks().slice(0, 10); track t.id) {
            <a [routerLink]="['/tasks', t.id]" class="ticket-row">
              <div class="tr-left">
                <span class="prio-dot" [style.background]="prioBg(t.priority)"></span>
                <div>
                  <div class="tr-title">{{ t.title }}</div>
                  <div class="text-xs muted">#{{ t.id }} · {{ t.dueDate ? (t.dueDate | date:'mediumDate') : ('lt.noDeadline' | t) }}</div>
                </div>
              </div>
              <span class="badge" [class]="'st-' + t.status">{{ t.status }}</span>
            </a>
          } @empty {
            <div class="empty text-sm">No assigned tickets.</div>
          }
        </div>
      }

    <!-- ══ ADMIN / MANAGER DASHBOARD ══ -->
    } @else {
      <div class="page-header"><h2>{{ 'dash.title' | t }}</h2></div>

      @if (loading()) { <div class="spin"></div> } @else {
        <!-- KPI cards -->
        <div class="kpis">
          <a [routerLink]="['/tasks']" class="kpi card card-pad">
            <div class="k-val">{{ stats()?.totalTasks }}</div><div class="k-lbl">{{ 'dash.total' | t }}</div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{statuses: ['Backlog','ToDo','InProgress','InReview','Blocked']}" class="kpi card card-pad">
            <div class="k-val">{{ stats()?.openTasks }}</div><div class="k-lbl">{{ 'dash.open' | t }}</div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{status:'InProgress'}" class="kpi card card-pad blue">
            <div class="k-val">{{ stats()?.inProgressTasks }}</div><div class="k-lbl">{{ 'dash.inProgress' | t }}</div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{status:'Done'}" class="kpi card card-pad green">
            <div class="k-val">{{ stats()?.completedTasks }}</div><div class="k-lbl">{{ 'dash.done' | t }}</div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{overdue:'true'}" class="kpi card card-pad red">
            <div class="k-val">{{ stats()?.overdueTasks }}</div><div class="k-lbl">{{ 'dash.overdue' | t }}</div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{overdue:'true'}" class="kpi card card-pad amber">
            <div class="k-val">{{ stats()?.slaBreaches }}</div><div class="k-lbl">{{ 'dash.sla' | t }}</div>
          </a>
          <a [routerLink]="['/tasks']" [queryParams]="{assigneeId: auth.user()?.id}" class="kpi card card-pad">
            <div class="k-val">{{ stats()?.myOpenTasks }}</div><div class="k-lbl">{{ 'dash.mine' | t }}</div>
          </a>
          <div class="kpi card card-pad">
            <div class="k-val">{{ stats()?.completionRate }}%</div><div class="k-lbl">{{ 'dash.rate' | t }}</div>
          </div>
        </div>

        <!-- Pie charts -->
        <div class="pies">
          <div class="card card-pad">
            <h4>{{ 'dash.statusDist' | t }}</h4>
            <app-pie-chart [data]="statusPie()" (sliceClick)="filterByStatus($event)"></app-pie-chart>
            <p class="chart-hint">Click a slice to see tasks</p>
          </div>
          <div class="card card-pad">
            <h4>{{ 'dash.prioDist' | t }}</h4>
            <app-pie-chart [data]="priorityPie()" (sliceClick)="filterByPriority($event)"></app-pie-chart>
            <p class="chart-hint">Click a slice to see tasks</p>
          </div>
          <div class="card card-pad">
            <h4>{{ 'dash.typeDist' | t }}</h4>
            <app-pie-chart [data]="typePie()" (sliceClick)="filterByType($event)"></app-pie-chart>
            <p class="chart-hint">Click a slice to see tasks</p>
          </div>
        </div>

        <div class="charts">
          <div class="card card-pad">
            <h4>{{ 'dash.byStatus' | t }}</h4>
            @for (c of charts()?.byStatus; track c.label) {
              <a class="bar-row link-row" [routerLink]="['/tasks']" [queryParams]="{status: c.label}">
                <span class="bar-lbl">{{ c.label }}</span>
                <div class="bar"><div class="bar-fill" [style.width.%]="pct(c.count, maxStatus())"></div></div>
                <span class="bar-val">{{ c.count }}</span>
              </a>
            }
          </div>

          <div class="card card-pad">
            <h4>{{ 'dash.byPriority' | t }}</h4>
            @for (c of charts()?.byPriority; track c.label) {
              <a class="bar-row link-row" [routerLink]="['/tasks']" [queryParams]="{priority: c.label}">
                <span class="bar-lbl">{{ c.label }}</span>
                <div class="bar"><div class="bar-fill" [class]="'pf-' + c.label" [style.width.%]="pct(c.count, maxPrio())"></div></div>
                <span class="bar-val">{{ c.count }}</span>
              </a>
            }
          </div>

          <div class="card card-pad">
            <h4>{{ 'dash.last7' | t }}</h4>
            <div class="spark">
              @for (c of charts()?.completedLast7Days; track c.label) {
                <div class="spark-col">
                  <div class="spark-bar" [style.height.%]="pct(c.count, maxWeek()) || 2"></div>
                  <span class="text-xs muted">{{ c.label }}</span>
                </div>
              }
            </div>
          </div>

          <div class="card card-pad">
            <h4>{{ 'dash.byProj' | t }}</h4>
            @for (c of charts()?.byProject; track c.label) {
              <div class="bar-row">
                <span class="bar-lbl">{{ c.label }}</span>
                <div class="bar"><div class="bar-fill teal" [style.width.%]="pct(c.count, maxProj())"></div></div>
                <span class="bar-val">{{ c.count }}</span>
              </div>
            } @empty { <div class="empty text-sm">No open tasks</div> }
          </div>
        </div>

        <!-- Type distribution -->
        <div class="card card-pad mt-2">
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

        <div class="card card-pad mt-2">
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
      }
    }
  </div>
  `
})
export class Dashboard implements OnInit {
  private svc = inject(DashboardService);
  private taskSvc = inject(TaskService);
  private router = inject(Router);
  auth = inject(AuthService);
  i18n = inject(I18nService);

  isEmployee = computed(() => this.auth.hasRole('Employee'));
  isTechnician = computed(() => this.auth.hasRole('Technician'));

  // Global dashboard (non-employee)
  stats = signal<DashboardStats | null>(null);
  charts = signal<DashboardCharts | null>(null);
  activity = signal<ActivityFeedItem[]>([]);
  loading = signal(true);

  // Employee dashboard
  empTickets = signal<TaskListItem[]>([]);
  empLoading = signal(true);
  empStats = computed(() => {
    const list = this.empTickets();
    const done = list.filter(t => t.status === 'Done').length;
    const total = list.length;
    return {
      total,
      open: list.filter(t => t.status === 'Backlog' || t.status === 'ToDo').length,
      inProgress: list.filter(t => t.status === 'InProgress' || t.status === 'Blocked' || t.status === 'InReview').length,
      done,
      overdue: list.filter(t => t.isOverdue).length,
      rate: total > 0 ? Math.round((done / total) * 100) : 0
    };
  });

  // Technician dashboard
  techTasks = signal<TaskListItem[]>([]);
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
      overdue: list.filter(t => t.isOverdue).length,
      rate: total > 0 ? Math.round((done / total) * 100) : 0
    };
  });

  ini = initials; ago = timeAgo;
  typeIcon = (t: string) => (TYPE_ICONS as Record<string, string>)[t] ?? '📋';
  prioBg = (p: string) => ({ Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' }[p] ?? '#94a3b8');

  private statusColors: Record<string, string> = {
    Backlog: '#94a3b8', ToDo: '#6366f1', InProgress: '#2563eb', InReview: '#eab308',
    Blocked: '#dc2626', Done: '#16a34a', Cancelled: '#cbd5e1'
  };
  private priorityColors: Record<string, string> = { Low: '#94a3b8', Medium: '#0ea5e9', High: '#f59e0b', Critical: '#dc2626' };
  private typeColors = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#22c55e', '#06b6d4', '#f59e0b'];

  statusPie = computed<PieSlice[]>(() => (this.charts()?.byStatus ?? []).map(c => ({ label: c.label, count: c.count, color: this.statusColors[c.label] })));
  priorityPie = computed<PieSlice[]>(() => (this.charts()?.byPriority ?? []).map(c => ({ label: c.label, count: c.count, color: this.priorityColors[c.label] })));
  typePie = computed<PieSlice[]>(() => (this.charts()?.byType ?? []).map((c, i) => ({ label: c.label, count: c.count, color: this.typeColors[i % this.typeColors.length] })));

  maxStatus = computed(() => Math.max(1, ...(this.charts()?.byStatus ?? []).map(c => c.count)));
  maxPrio = computed(() => Math.max(1, ...(this.charts()?.byPriority ?? []).map(c => c.count)));
  maxWeek = computed(() => Math.max(1, ...(this.charts()?.completedLast7Days ?? []).map(c => c.count)));
  maxProj = computed(() => Math.max(1, ...(this.charts()?.byProject ?? []).map(c => c.count)));

  ngOnInit() {
    if (this.isEmployee()) {
      this.taskSvc.query({ sortBy: 'createdAt', sortDescending: true, pageSize: 500 }).subscribe({
        next: r => { this.empTickets.set(r.items); this.empLoading.set(false); },
        error: () => this.empLoading.set(false)
      });
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
