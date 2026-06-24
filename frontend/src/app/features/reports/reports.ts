import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { OrganizationService, ReportService } from '../../core/services/data.services';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import {
  Area, AreaReport, Branch, BranchReport, ByTagReport, ByUserReport, OverviewReport, ReportBreakdown, ReportStats, UserReportRow
} from '../../core/models/models';
import { PieChart, PieSlice } from '../../shared/pie-chart';

type Mode = 'overview' | 'branch' | 'area' | 'tag' | 'user';

@Component({
  selector: 'app-reports',
  imports: [FormsModule, DatePipe, PieChart, TranslatePipe],
  styleUrl: './reports.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header no-print">
      <h2>{{ 'rep.title' | t }}</h2>
      <button class="btn btn-primary" (click)="print()" [disabled]="loading()">🖨 {{ 'c.print' | t }}</button>
    </div>

    <div class="card card-pad controls no-print">
      <div class="seg">
        <button class="seg-btn" [class.on]="mode()==='overview'" (click)="setMode('overview')">{{ 'rep.overview' | t }}</button>
        <button class="seg-btn" [class.on]="mode()==='area'" (click)="setMode('area')">{{ 'rep.byArea' | t }}</button>
        <button class="seg-btn" [class.on]="mode()==='branch'" (click)="setMode('branch')">{{ 'rep.byBranch' | t }}</button>
        <button class="seg-btn" [class.on]="mode()==='tag'" (click)="setMode('tag')">{{ 'rep.byTag' | t }}</button>
        <button class="seg-btn" [class.on]="mode()==='user'" (click)="setMode('user')">{{ 'rep.byUser' | t }}</button>
      </div>
      @if (mode()==='area') {
        <select [(ngModel)]="areaId" (ngModelChange)="loadArea()">
          @for (a of areas(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
        </select>
      }
      @if (mode()==='branch') {
        <select [(ngModel)]="branchId" (ngModelChange)="loadBranch()">
          @for (b of branches(); track b.id) { <option [ngValue]="b.id">{{ b.name }} ({{ b.areaName }})</option> }
        </select>
      }
    </div>

    @if (loading()) { <div class="spin"></div> }
    @else {
      <div class="report-sheet card">
        <!-- header -->
        <div class="rep-head">
          <div>
            <div class="rep-brand">{{ 'app.brand' | t }}</div>
            <h1>{{ title() }}</h1>
            <div class="muted text-sm">Generated {{ generatedAt() | date:'medium' }}</div>
          </div>
          <div class="rep-logo">TF</div>
        </div>

        <!-- summary KPIs -->
        @if (stats(); as s) {
          <div class="rep-kpis">
            <div class="rk"><div class="rk-v">{{ s.total }}</div><div class="rk-l">{{ 'rep.total' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.open }}</div><div class="rk-l">{{ 'rep.open' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.inProgress }}</div><div class="rk-l">{{ 'rep.inProgress' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.completed }}</div><div class="rk-l">{{ 'rep.completed' | t }}</div></div>
            <div class="rk"><div class="rk-v danger">{{ s.overdue }}</div><div class="rk-l">{{ 'rep.overdue' | t }}</div></div>
            <div class="rk"><div class="rk-v danger">{{ s.slaBreaches }}</div><div class="rk-l">{{ 'rep.sla' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.unassigned }}</div><div class="rk-l">{{ 'rep.unassigned' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.completionRate }}%</div><div class="rk-l">{{ 'rep.completion' | t }}</div></div>
          </div>
        }

        <!-- distribution pies -->
        @if (breakdown(); as b) {
          <div class="rep-section">
            <h3>{{ 'rep.distributions' | t }}</h3>
            <div class="rep-pies">
              <div><h4>{{ 'rep.byStatus' | t }}</h4><app-pie-chart [data]="toPie(b.byStatus, statusColors)"></app-pie-chart></div>
              <div><h4>{{ 'rep.byPriority' | t }}</h4><app-pie-chart [data]="toPie(b.byPriority, prioColors)"></app-pie-chart></div>
              <div><h4>{{ 'rep.byType' | t }}</h4><app-pie-chart [data]="toPie(b.byType)"></app-pie-chart></div>
            </div>
          </div>

          @if (b.byAssignee.length) {
            <div class="rep-section">
              <h3>{{ 'rep.workload' | t }}</h3>
              <table class="table">
                <thead><tr><th>{{ 'rep.tech' | t }}</th><th>{{ 'rep.tasks' | t }}</th></tr></thead>
                <tbody>@for (r of b.byAssignee; track r.label) { <tr><td>{{ r.label }}</td><td>{{ r.count }}</td></tr> }</tbody>
              </table>
            </div>
          }
        }

        <!-- per-branch / per-area breakdown -->
        @if (areaReport(); as ar) {
          <div class="rep-section">
            <h3>{{ 'rep.branchBreakdown' | t }}</h3>
            <table class="table">
              <thead><tr><th>{{ 'org.branch' | t }}</th><th>{{ 'org.code' | t }}</th><th>{{ 'rep.total' | t }}</th><th>{{ 'rep.open' | t }}</th><th>{{ 'rep.overdue' | t }}</th><th>{{ 'rep.slaCol' | t }}</th><th>{{ 'rep.completion' | t }}</th></tr></thead>
              <tbody>
                @for (r of ar.branches; track r.branchId) {
                  <tr><td>{{ r.branchName }}</td><td>{{ r.branchCode }}</td>
                    <td>{{ r.stats.total }}</td><td>{{ r.stats.open }}</td>
                    <td>{{ r.stats.overdue }}</td><td>{{ r.stats.slaBreaches }}</td><td>{{ r.stats.completionRate }}%</td></tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (overview(); as ov) {
          <div class="rep-section">
            <h3>{{ 'rep.areaBreakdown' | t }}</h3>
            <table class="table">
              <thead><tr><th>{{ 'org.area' | t }}</th><th>{{ 'org.code' | t }}</th><th>{{ 'org.branches' | t }}</th><th>{{ 'rep.total' | t }}</th><th>{{ 'rep.open' | t }}</th><th>{{ 'rep.overdue' | t }}</th><th>{{ 'rep.slaCol' | t }}</th><th>{{ 'rep.completion' | t }}</th></tr></thead>
              <tbody>
                @for (r of ov.areas; track r.areaId) {
                  <tr><td>{{ r.areaName }}</td><td>{{ r.areaCode }}</td><td>{{ r.branchCount }}</td>
                    <td>{{ r.stats.total }}</td><td>{{ r.stats.open }}</td>
                    <td>{{ r.stats.overdue }}</td><td>{{ r.stats.slaBreaches }}</td><td>{{ r.stats.completionRate }}%</td></tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- detailed task list (branch report) -->
        @if (branchReport(); as br) {
          <div class="rep-section">
            <h3>{{ 'rep.taskDetail' | t }} ({{ br.tasks.length }})</h3>
            <table class="table compact">
              <thead><tr><th>#</th><th>{{ 'task.title' | t }}</th><th>{{ 'task.status' | t }}</th><th>{{ 'task.priority' | t }}</th><th>{{ 'task.type' | t }}</th><th>{{ 'task.assignee' | t }}</th><th>{{ 'task.due' | t }}</th></tr></thead>
              <tbody>
                @for (t of br.tasks; track t.id) {
                  <tr><td>{{ t.id }}</td><td>{{ t.title }}</td>
                    <td>{{ t.status }}</td><td>{{ t.priority }}</td><td>{{ t.type }}</td>
                    <td>{{ t.assigneeName || '—' }}</td>
                    <td [class.danger]="t.isOverdue">{{ t.dueDate ? (t.dueDate | date:'shortDate') : '—' }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- By Tag report -->
        @if (mode() === 'tag') {
          @if (tagReport(); as tr) {
            <div class="rep-section">
              <h3>{{ 'rep.tagReport' | t }}</h3>
              @if (tr.tags.length === 0) {
                <div class="empty text-sm">{{ 'rep.noTagTasks' | t }}</div>
              } @else {
                <table class="table">
                  <thead>
                    <tr>
                      <th>{{ 'rep.tag' | t }}</th>
                      <th>{{ 'rep.total' | t }}</th>
                      <th>{{ 'rep.open' | t }}</th>
                      <th>{{ 'rep.inProgress' | t }}</th>
                      <th>{{ 'rep.completed' | t }}</th>
                      <th>{{ 'rep.overdue' | t }}</th>
                      <th>{{ 'rep.slaCol' | t }}</th>
                      <th>{{ 'rep.completion' | t }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of tr.tags; track r.tagId) {
                      <tr>
                        <td>
                          <span class="tag-pill" [style.background]="r.tagColor">
                            @if (r.tagIcon) { {{ r.tagIcon }} } {{ r.tagName }}
                          </span>
                        </td>
                        <td>{{ r.stats.total }}</td>
                        <td>{{ r.stats.open }}</td>
                        <td>{{ r.stats.inProgress }}</td>
                        <td>{{ r.stats.completed }}</td>
                        <td [class.danger]="r.stats.overdue > 0">{{ r.stats.overdue }}</td>
                        <td [class.danger]="r.stats.slaBreaches > 0">{{ r.stats.slaBreaches }}</td>
                        <td>{{ r.stats.completionRate }}%</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          }
        }

        <!-- By User report — Evaluation cards -->
        @if (mode() === 'user') {
          @if (userReport(); as ur) {
            <div class="rep-section">
              <h3>{{ 'rep.userReport' | t }}</h3>
              @if (ur.users.length === 0) {
                <div class="empty text-sm">{{ 'rep.noUsers' | t }}</div>
              } @else {
                <div class="eval-meta-bar">
                  <span class="muted text-sm">{{ sortedUsers().length }} {{ 'rep.user' | t }}s · {{ 'rep.rankedByRate' | t }}</span>
                  @if (sortedUsers().length > 0) {
                    <span class="perf-badge pb-excellent">🏆 {{ sortedUsers()[0].fullName }}</span>
                  }
                </div>
                @for (r of sortedUsers(); track r.userId; let idx = $index) {
                  <div class="eval-card" [class]="'ec-' + perfClass(r)">
                    <div class="eval-rank">{{ idx + 1 }}</div>
                    <div class="eval-avatar" [class]="'ea-' + perfClass(r)">{{ ini(r.fullName) }}</div>
                    <div class="eval-info">
                      <div class="eval-name">{{ r.fullName }}</div>
                      <div class="eval-sub">{{ r.jobTitle || '—' }} · {{ r.roleName || '—' }}</div>
                    </div>
                    <div class="eval-stats">
                      <div class="es-item"><span class="es-val">{{ r.stats.total }}</span><span class="es-lbl">{{ 'rep.total' | t }}</span></div>
                      <div class="es-item es-green"><span class="es-val">{{ r.stats.completed }}</span><span class="es-lbl">{{ 'rep.completed' | t }}</span></div>
                      <div class="es-item es-blue"><span class="es-val">{{ r.stats.inProgress }}</span><span class="es-lbl">{{ 'rep.inProgress' | t }}</span></div>
                      <div class="es-item es-amber"><span class="es-val">{{ r.stats.open }}</span><span class="es-lbl">{{ 'rep.open' | t }}</span></div>
                      <div class="es-item es-red"><span class="es-val">{{ r.stats.overdue }}</span><span class="es-lbl">{{ 'rep.overdue' | t }}</span></div>
                      <div class="es-item es-red"><span class="es-val">{{ r.stats.slaBreaches }}</span><span class="es-lbl">{{ 'rep.slaCol' | t }}</span></div>
                    </div>
                    <div class="eval-rate-wrap">
                      <div class="eval-rate-bar">
                        <div class="eval-rate-fill" [class]="'erf-' + perfClass(r)" [style.width.%]="r.stats.completionRate"></div>
                      </div>
                      <span class="eval-rate-pct">{{ r.stats.completionRate }}%</span>
                    </div>
                    <div class="perf-badge" [class]="'pb-' + perfClass(r)">{{ perfLabel(r) }}</div>
                  </div>
                }
              }
            </div>
          }
        }

        <div class="rep-foot text-xs muted">{{ 'app.confidential' | t }} · {{ 'rep.generated' | t }} {{ generatedAt() | date:'short' }}</div>
      </div>
    }
  </div>
  `
})
export class Reports implements OnInit {
  private reportSvc = inject(ReportService);
  private org = inject(OrganizationService);
  i18n = inject(I18nService);

  mode = signal<Mode>('overview');
  loading = signal(true);
  areas = signal<Area[]>([]);
  branches = signal<Branch[]>([]);
  areaId?: number;
  branchId?: number;

  overview = signal<OverviewReport | null>(null);
  areaReport = signal<AreaReport | null>(null);
  branchReport = signal<BranchReport | null>(null);
  tagReport = signal<ByTagReport | null>(null);
  userReport = signal<ByUserReport | null>(null);

  statusColors: Record<string, string> = {
    Backlog: '#94a3b8', ToDo: '#6366f1', InProgress: '#2563eb', InReview: '#eab308',
    Blocked: '#dc2626', Done: '#16a34a', Cancelled: '#cbd5e1'
  };
  prioColors: Record<string, string> = { Low: '#94a3b8', Medium: '#0ea5e9', High: '#f59e0b', Critical: '#dc2626' };

  stats = computed<ReportStats | null>(() =>
    this.mode() === 'overview' ? this.overview()?.stats ?? null
    : this.mode() === 'area' ? this.areaReport()?.stats ?? null
    : this.mode() === 'branch' ? this.branchReport()?.stats ?? null
    : null);

  breakdown = computed<ReportBreakdown | null>(() =>
    this.mode() === 'overview' ? this.overview()?.breakdown ?? null
    : this.mode() === 'area' ? this.areaReport()?.breakdown ?? null
    : this.mode() === 'branch' ? this.branchReport()?.breakdown ?? null
    : null);

  title = computed(() =>
    this.mode() === 'overview' ? 'Organization Overview Report'
    : this.mode() === 'area' ? `Area Report — ${this.areaReport()?.areaName ?? ''}`
    : this.mode() === 'branch' ? `Branch Report — ${this.branchReport()?.branchName ?? ''}`
    : this.mode() === 'tag' ? 'Tag Distribution Report'
    : 'User Performance Report');

  generatedAt = computed(() =>
    this.overview()?.generatedAt ?? this.areaReport()?.generatedAt ?? this.branchReport()?.generatedAt
    ?? this.tagReport()?.generatedAt ?? this.userReport()?.generatedAt ?? new Date().toISOString());

  ngOnInit() {
    this.org.getAreas().subscribe(a => { this.areas.set(a); if (a.length) this.areaId = a[0].id; });
    this.org.getBranches().subscribe(b => { this.branches.set(b); if (b.length) this.branchId = b[0].id; });
    this.loadOverview();
  }

  setMode(m: Mode) {
    this.mode.set(m);
    if (m === 'overview') this.loadOverview();
    else if (m === 'area') this.loadArea();
    else if (m === 'branch') this.loadBranch();
    else if (m === 'tag') this.loadTag();
    else if (m === 'user') this.loadUser();
  }

  loadOverview() { this.loading.set(true); this.reportSvc.overview().subscribe({ next: r => { this.overview.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadArea() { if (!this.areaId) return; this.loading.set(true); this.reportSvc.area(this.areaId).subscribe({ next: r => { this.areaReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadBranch() { if (!this.branchId) return; this.loading.set(true); this.reportSvc.branch(this.branchId).subscribe({ next: r => { this.branchReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadTag() { this.loading.set(true); this.reportSvc.byTag().subscribe({ next: r => { this.tagReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadUser() { this.loading.set(true); this.reportSvc.byUser().subscribe({ next: r => { this.userReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }

  sortedUsers = computed(() =>
    [...(this.userReport()?.users ?? [])].sort((a, b) => b.stats.completionRate - a.stats.completionRate)
  );

  perfClass(r: UserReportRow): string {
    if (r.stats.total === 0) return 'none';
    const rate = r.stats.completionRate;
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    if (rate >= 40) return 'average';
    return 'poor';
  }

  perfLabel(r: UserReportRow): string {
    const ar = this.i18n.dir() === 'rtl';
    if (r.stats.total === 0) return ar ? 'لا بيانات' : 'No Data';
    const rate = r.stats.completionRate;
    if (rate >= 80) return ar ? 'ممتاز' : 'Excellent';
    if (rate >= 60) return ar ? 'جيد' : 'Good';
    if (rate >= 40) return ar ? 'متوسط' : 'Average';
    return ar ? 'ضعيف' : 'Poor';
  }

  ini(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  toPie(rows: { label: string; count: number }[], colors?: Record<string, string>): PieSlice[] {
    return rows.map(r => ({ label: r.label, count: r.count, color: colors?.[r.label] }));
  }

  print() { window.print(); }
}
