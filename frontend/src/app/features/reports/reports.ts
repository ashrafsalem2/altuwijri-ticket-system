import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { OrganizationService, ReportService, UserService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import {
  AllTasksReport, Area, AreaReport, Branch, BranchReport, ByDepartmentReport, ByGroupReport, ByTagReport, ByUserReport,
  CountByLabel, DepartmentReportRow, GroupReportRow, OverdueReport, OverdueTaskRow, OverviewReport,
  ReportBreakdown, ReportStats, SingleTaskReport, SingleUserReport, TrendReport, User, UserReportRow
} from '../../core/models/models';
import { PieChart, PieSlice } from '../../shared/pie-chart';

type Mode = 'overview' | 'branch' | 'area' | 'tag' | 'user' | 'group' | 'department'
          | 'single-user' | 'single-task' | 'all-tasks' | 'trend' | 'aging';

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

    <!-- ── Mode selector ── -->
    <div class="card card-pad controls no-print">
      <div class="seg-wrap">
        <div class="seg">
          <button class="seg-btn" [class.on]="mode()==='overview'" (click)="setMode('overview')">{{ 'rep.overview' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='area'" (click)="setMode('area')">{{ 'rep.byArea' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='branch'" (click)="setMode('branch')">{{ 'rep.byBranch' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='tag'" (click)="setMode('tag')">{{ 'rep.byTag' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='user'" (click)="setMode('user')">{{ 'rep.byUser' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='group'" (click)="setMode('group')">{{ 'rep.byGroup' | t }}</button>
          @if (isManager()) {
            <button class="seg-btn dept-seg" [class.on]="mode()==='department'" (click)="setMode('department')">{{ 'rep.byDept' | t }}</button>
          }
        </div>
        <div class="seg seg-analytics">
          <button class="seg-btn" [class.on]="mode()==='single-user'" (click)="setMode('single-user')">👤 {{ 'rep.singleUser' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='single-task'" (click)="setMode('single-task')">🎫 {{ 'rep.singleTask' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='all-tasks'" (click)="setMode('all-tasks')">📋 {{ 'rep.allTasks' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='trend'" (click)="setMode('trend')">📈 {{ 'rep.trend' | t }}</button>
          <button class="seg-btn" [class.on]="mode()==='aging'" (click)="setMode('aging')">⏱ {{ 'rep.aging' | t }}</button>
        </div>
      </div>

      <!-- Mode-specific controls -->
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
      @if (mode()==='single-user') {
        <div class="ctrl-row">
          <select [(ngModel)]="selectedUserId">
            <option [ngValue]="null">{{ 'rep.selectUser' | t }}</option>
            @for (u of users(); track u.id) { <option [ngValue]="u.id">{{ u.fullName }} ({{ u.roleName }})</option> }
          </select>
          <input type="date" [(ngModel)]="filterFrom" class="input input-sm" />
          <span class="muted">→</span>
          <input type="date" [(ngModel)]="filterTo" class="input input-sm" />
          <button class="btn btn-primary btn-sm" [disabled]="!selectedUserId" (click)="loadSingleUser()">{{ 'rep.loadReport' | t }}</button>
        </div>
      }
      @if (mode()==='single-task') {
        <div class="ctrl-row">
          <label class="muted">{{ 'rep.taskId' | t }}</label>
          <input type="number" [(ngModel)]="selectedTaskId" class="input input-sm" style="width:100px" min="1" (keydown.enter)="loadSingleTask()" />
          <button class="btn btn-primary btn-sm" [disabled]="!selectedTaskId" (click)="loadSingleTask()">{{ 'rep.loadReport' | t }}</button>
        </div>
      }
      @if (mode()==='all-tasks') {
        <div class="ctrl-row">
          <label class="muted">{{ 'rep.filterDate' | t }}</label>
          <input type="date" [(ngModel)]="filterFrom" class="input input-sm" />
          <span class="muted">→</span>
          <input type="date" [(ngModel)]="filterTo" class="input input-sm" />
          <button class="btn btn-primary btn-sm" (click)="loadAllTasks()">{{ 'rep.applyFilter' | t }}</button>
        </div>
      }
    </div>

    @if (loading()) { <div class="spin"></div> }
    @else {
      <div class="report-sheet card">

        <!-- ── Report header ── -->
        <div class="rep-head">
          <div>
            <div class="rep-brand">{{ 'app.brand' | t }}</div>
            <h1>{{ title() }}</h1>
            <div class="muted text-sm">Generated {{ generatedAt() | date:'medium' }}</div>
          </div>
          <div class="rep-logo">TF</div>
        </div>

        <!-- ── Summary KPIs (aggregate modes) ── -->
        @if (stats(); as s) {
          <div class="rep-kpis">
            <div class="rk"><div class="rk-v">{{ s.total }}</div><div class="rk-l">{{ 'rep.total' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.open }}</div><div class="rk-l">{{ 'rep.open' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.inProgress }}</div><div class="rk-l">{{ 'rep.inProgress' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.completed }}</div><div class="rk-l">{{ 'rep.completed' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.unassigned }}</div><div class="rk-l">{{ 'rep.unassigned' | t }}</div></div>
            <div class="rk"><div class="rk-v">{{ s.completionRate }}%</div><div class="rk-l">{{ 'rep.completion' | t }}</div></div>
          </div>
        }

        <!-- ── Distribution pies ── -->
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

        <!-- ── All Tasks: extra breakdowns ── -->
        @if (mode() === 'all-tasks' && allTasksReport(); as at) {
          @if (at.byCategory.length || at.byProject.length) {
            <div class="rep-section">
              <div class="rep-pies">
                @if (at.byCategory.length) {
                  <div>
                    <h4>{{ 'rep.byCategory' | t }}</h4>
                    <app-pie-chart [data]="toPie(at.byCategory)"></app-pie-chart>
                  </div>
                }
                @if (at.byProject.length) {
                  <div>
                    <h4>{{ 'rep.byProject' | t }}</h4>
                    <app-pie-chart [data]="toPie(at.byProject)"></app-pie-chart>
                  </div>
                }
              </div>
            </div>
          }
          <div class="rep-section">
            <h3>{{ 'rep.taskDetail' | t }} ({{ at.tasks.length }})</h3>
            <table class="table compact">
              <thead>
                <tr>
                  <th>#</th><th>{{ 'task.title' | t }}</th><th>{{ 'task.status' | t }}</th>
                  <th>{{ 'task.priority' | t }}</th><th>{{ 'task.type' | t }}</th>
                  <th>{{ 'task.assignee' | t }}</th><th>{{ 'tc.title' | t }}</th><th>{{ 'task.created' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (t of at.tasks; track t.id) {
                  <tr>
                    <td class="muted">{{ t.id }}</td>
                    <td dir="auto">{{ t.title }}</td>
                    <td><span class="status-chip st-{{ t.status }}">{{ t.status }}</span></td>
                    <td>{{ t.priority }}</td><td>{{ t.type }}</td>
                    <td>{{ t.assigneeName || '—' }}</td>
                    <td>{{ t.categoryName || '—' }}</td>
                    <td class="muted">{{ t.createdAt | date:'shortDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- ── Per-branch / per-area breakdown ── -->
        @if (areaReport(); as ar) {
          <div class="rep-section">
            <h3>{{ 'rep.branchBreakdown' | t }}</h3>
            <table class="table">
              <thead><tr><th>{{ 'org.branch' | t }}</th><th>{{ 'org.code' | t }}</th><th>{{ 'rep.total' | t }}</th><th>{{ 'rep.open' | t }}</th><th>{{ 'rep.completion' | t }}</th></tr></thead>
              <tbody>
                @for (r of ar.branches; track r.branchId) {
                  <tr><td>{{ r.branchName }}</td><td>{{ r.branchCode }}</td>
                    <td>{{ r.stats.total }}</td><td>{{ r.stats.open }}</td>
                    <td>{{ r.stats.completionRate }}%</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
        @if (overview(); as ov) {
          <div class="rep-section">
            <h3>{{ 'rep.areaBreakdown' | t }}</h3>
            <table class="table">
              <thead><tr><th>{{ 'org.area' | t }}</th><th>{{ 'org.code' | t }}</th><th>{{ 'org.branches' | t }}</th><th>{{ 'rep.total' | t }}</th><th>{{ 'rep.open' | t }}</th><th>{{ 'rep.completion' | t }}</th></tr></thead>
              <tbody>
                @for (r of ov.areas; track r.areaId) {
                  <tr><td>{{ r.areaName }}</td><td>{{ r.areaCode }}</td><td>{{ r.branchCount }}</td>
                    <td>{{ r.stats.total }}</td><td>{{ r.stats.open }}</td>
                    <td>{{ r.stats.completionRate }}%</td></tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- ── Branch detail task list ── -->
        @if (branchReport(); as br) {
          <div class="rep-section">
            <h3>{{ 'rep.taskDetail' | t }} ({{ br.tasks.length }})</h3>
            <table class="table compact">
              <thead><tr><th>#</th><th>{{ 'task.title' | t }}</th><th>{{ 'task.status' | t }}</th><th>{{ 'task.priority' | t }}</th><th>{{ 'task.type' | t }}</th><th>{{ 'task.assignee' | t }}</th><th>{{ 'task.elapsed' | t }}</th></tr></thead>
              <tbody>
                @for (t of br.tasks; track t.id) {
                  <tr><td>{{ t.id }}</td><td dir="auto">{{ t.title }}</td>
                    <td>{{ t.status }}</td><td>{{ t.priority }}</td><td>{{ t.type }}</td>
                    <td>{{ t.assigneeName || '—' }}</td>
                    <td>{{ t.startDate ? (t.startDate | date:'shortDate') : '—' }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        }

        <!-- ── By Tag ── -->
        @if (mode() === 'tag' && tagReport(); as tr) {
          <div class="rep-section">
            <h3>{{ 'rep.tagReport' | t }}</h3>
            @if (tr.tags.length === 0) {
              <div class="empty text-sm">{{ 'rep.noTagTasks' | t }}</div>
            } @else {
              <table class="table">
                <thead><tr><th>{{ 'rep.tag' | t }}</th><th>{{ 'rep.total' | t }}</th><th>{{ 'rep.open' | t }}</th><th>{{ 'rep.inProgress' | t }}</th><th>{{ 'rep.completed' | t }}</th><th>{{ 'rep.completion' | t }}</th></tr></thead>
                <tbody>
                  @for (r of tr.tags; track r.tagId) {
                    <tr>
                      <td><span class="tag-pill" [style.background]="r.tagColor">@if (r.tagIcon) { {{ r.tagIcon }} } {{ r.tagName }}</span></td>
                      <td>{{ r.stats.total }}</td><td>{{ r.stats.open }}</td>
                      <td>{{ r.stats.inProgress }}</td><td>{{ r.stats.completed }}</td>
                      <td>{{ r.stats.completionRate }}%</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- ── By User (all users ranked) ── -->
        @if (mode() === 'user' && userReport(); as ur) {
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
                  </div>
                  <div class="eval-rate-wrap">
                    <div class="eval-rate-bar"><div class="eval-rate-fill" [class]="'erf-' + perfClass(r)" [style.width.%]="r.stats.completionRate"></div></div>
                    <span class="eval-rate-pct">{{ r.stats.completionRate }}%</span>
                  </div>
                  @if (r.avgResponseMinutes != null) {
                    <div class="eval-response">
                      <span class="er-lbl">{{ 'rep.responseTime' | t }}</span>
                      <span class="er-item er-avg" title="{{ 'rep.avgResponse' | t }}">⌀ {{ fmtMins(r.avgResponseMinutes) }}</span>
                      <span class="er-item er-fast" title="{{ 'rep.fastResponse' | t }}">▲ {{ fmtMins(r.fastestResponseMinutes) }}</span>
                      <span class="er-item er-slow" title="{{ 'rep.slowResponse' | t }}">▼ {{ fmtMins(r.slowestResponseMinutes) }}</span>
                    </div>
                  }
                  <div class="perf-badge" [class]="'pb-' + perfClass(r)">{{ perfLabel(r) }}</div>
                </div>
              }
            }
          </div>
        }

        <!-- ── By Group ── -->
        @if (mode() === 'group' && groupReport(); as gr) {
          <div class="rep-section">
            <h3>{{ 'rep.groupReport' | t }}</h3>
            @if (gr.groups.length === 0) { <div class="empty text-sm">{{ 'rep.noGroups' | t }}</div> }
            @else {
              <table class="table">
                <thead><tr><th>{{ 'rep.group' | t }}</th><th>{{ 'rep.techs' | t }}</th><th>{{ 'rep.total' | t }}</th><th>{{ 'rep.open' | t }}</th><th>{{ 'rep.inProgress' | t }}</th><th>{{ 'rep.completed' | t }}</th><th>{{ 'rep.unassigned' | t }}</th><th>{{ 'rep.completion' | t }}</th></tr></thead>
                <tbody>
                  @for (r of gr.groups; track r.categoryId) {
                    <tr>
                      <td><span class="group-pill" [style.border-left-color]="r.categoryColor"><span class="group-icon" [style.background]="r.categoryColor + '22'">{{ r.categoryIcon }}</span>{{ r.categoryName }}</span></td>
                      <td>{{ r.technicianCount }}</td><td>{{ r.stats.total }}</td><td>{{ r.stats.open }}</td>
                      <td>{{ r.stats.inProgress }}</td><td>{{ r.stats.completed }}</td><td>{{ r.stats.unassigned }}</td>
                      <td><div class="rate-cell"><div class="rate-bar"><div class="rate-fill" [style.width.%]="r.stats.completionRate" [style.background]="r.categoryColor"></div></div><span>{{ r.stats.completionRate }}%</span></div></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- ── By Department ── -->
        @if (mode() === 'department' && deptReport(); as dr) {
          <div class="rep-section">
            <h3>{{ 'rep.deptReport' | t }}</h3>
            @if (dr.departments.length === 0) { <div class="empty text-sm">{{ 'rep.noDeptTasks' | t }}</div> }
            @else {
              <div class="dept-report-grid">
                @for (d of dr.departments; track d.departmentId; let i = $index) {
                  <div class="dr-card">
                    <div class="dr-card-head">
                      <div class="dr-avatar" [style.background]="DEPT_PALETTE[i % DEPT_PALETTE.length]">{{ d.departmentName.charAt(0).toUpperCase() }}</div>
                      <div class="dr-title-block">
                        <div class="dr-name">{{ d.departmentName }}</div>
                        <div class="dr-meta">
                          @if (d.departmentCode) { <span class="dr-code">{{ d.departmentCode }}</span> }
                          <span class="dr-users-pill">👤 {{ d.userCount }} {{ 'rep.deptUsers' | t }}</span>
                        </div>
                      </div>
                      <div class="dr-kpis">
                        <div class="dr-kpi"><span class="dr-kv">{{ d.stats.total }}</span><span class="dr-kl">{{ 'rep.total' | t }}</span></div>
                        <div class="dr-kpi dr-green"><span class="dr-kv">{{ d.stats.completed }}</span><span class="dr-kl">{{ 'rep.completed' | t }}</span></div>
                        <div class="dr-kpi dr-blue"><span class="dr-kv">{{ d.stats.inProgress }}</span><span class="dr-kl">{{ 'rep.inProgress' | t }}</span></div>
                        <div class="dr-kpi dr-amber"><span class="dr-kv">{{ d.stats.open }}</span><span class="dr-kl">{{ 'rep.open' | t }}</span></div>
                      </div>
                      <div class="dr-rate-wrap">
                        <div class="dr-rate-bar"><div class="dr-rate-fill" [style.width.%]="d.stats.completionRate" [style.background]="DEPT_PALETTE[i % DEPT_PALETTE.length]"></div></div>
                        <span class="dr-rate-pct">{{ d.stats.completionRate }}%</span>
                      </div>
                      @if (d.users.length > 0) {
                        <button class="dr-toggle" (click)="toggleDept(d.departmentId)">
                          {{ expandedDepts().has(d.departmentId) ? '▲' : '▼' }} {{ 'rep.deptBreakdown' | t }}
                        </button>
                      }
                    </div>
                    @if (expandedDepts().has(d.departmentId) && d.users.length > 0) {
                      <div class="dr-users">
                        <table class="table compact">
                          <thead><tr><th>#</th><th>{{ 'rep.user' | t }}</th><th>{{ 'rep.jobTitle' | t }}</th><th>{{ 'rep.role' | t }}</th><th>{{ 'rep.total' | t }}</th><th>{{ 'rep.completed' | t }}</th><th>{{ 'rep.open' | t }}</th><th>{{ 'rep.completion' | t }}</th></tr></thead>
                          <tbody>
                            @for (u of d.users; track u.userId; let ui = $index) {
                              <tr>
                                <td class="muted">{{ ui + 1 }}</td>
                                <td><span class="mini-avatar" [style.background]="DEPT_PALETTE[(i + ui) % DEPT_PALETTE.length]">{{ ini(u.fullName) }}</span>{{ u.fullName }}</td>
                                <td class="muted">{{ u.jobTitle || '—' }}</td>
                                <td class="muted">{{ u.roleName || '—' }}</td>
                                <td>{{ u.stats.total }}</td>
                                <td class="text-green">{{ u.stats.completed }}</td>
                                <td class="text-amber">{{ u.stats.open }}</td>
                                <td><div class="rate-cell"><div class="rate-bar"><div class="rate-fill" [style.width.%]="u.stats.completionRate" [style.background]="DEPT_PALETTE[i % DEPT_PALETTE.length]"></div></div><span>{{ u.stats.completionRate }}%</span></div></td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ════════════════════════════════════════
             NEW: SINGLE USER PROFILE REPORT
        ════════════════════════════════════════ -->
        @if (mode() === 'single-user') {
          @if (!singleUserReport()) {
            <div class="empty-prompt">
              <div class="ep-icon">👤</div>
              <div class="ep-text">{{ 'rep.selectUser' | t }}</div>
            </div>
          } @else {
            @let u = singleUserReport()!;
            <!-- KPI twin panels -->
            <div class="su-kpi-grid">
              <div class="su-panel">
                <div class="su-panel-title">{{ 'rep.assignedStats' | t }}</div>
                <div class="rep-kpis">
                  <div class="rk"><div class="rk-v">{{ u.assignedStats.total }}</div><div class="rk-l">{{ 'rep.total' | t }}</div></div>
                  <div class="rk"><div class="rk-v">{{ u.assignedStats.completed }}</div><div class="rk-l">{{ 'rep.completed' | t }}</div></div>
                  <div class="rk"><div class="rk-v">{{ u.assignedStats.inProgress }}</div><div class="rk-l">{{ 'rep.inProgress' | t }}</div></div>
                  <div class="rk"><div class="rk-v">{{ u.assignedStats.completionRate }}%</div><div class="rk-l">{{ 'rep.completion' | t }}</div></div>
                </div>
              </div>
              <div class="su-panel">
                <div class="su-panel-title">{{ 'rep.submittedStats' | t }}</div>
                <div class="rep-kpis">
                  <div class="rk"><div class="rk-v">{{ u.submittedStats.total }}</div><div class="rk-l">{{ 'rep.total' | t }}</div></div>
                  <div class="rk"><div class="rk-v">{{ u.submittedStats.completed }}</div><div class="rk-l">{{ 'rep.completed' | t }}</div></div>
                  <div class="rk"><div class="rk-v">{{ u.submittedStats.open }}</div><div class="rk-l">{{ 'rep.open' | t }}</div></div>
                  <div class="rk"><div class="rk-v">{{ u.submittedStats.completionRate }}%</div><div class="rk-l">{{ 'rep.completion' | t }}</div></div>
                </div>
              </div>
            </div>

            <!-- Response & resolution KPIs -->
            <div class="rep-section">
              <div class="su-time-strip">
                @if (u.avgResponseMinutes != null) {
                  <div class="su-time-card">
                    <div class="stc-icon">⚡</div>
                    <div class="stc-body">
                      <div class="stc-val">{{ fmtMins(u.avgResponseMinutes) }}</div>
                      <div class="stc-lbl">{{ 'rep.avgResponse' | t }}</div>
                    </div>
                  </div>
                  <div class="su-time-card stc-green">
                    <div class="stc-icon">▲</div>
                    <div class="stc-body">
                      <div class="stc-val">{{ fmtMins(u.fastestResponseMinutes) }}</div>
                      <div class="stc-lbl">{{ 'rep.fastResponse' | t }}</div>
                    </div>
                  </div>
                  <div class="su-time-card stc-red">
                    <div class="stc-icon">▼</div>
                    <div class="stc-body">
                      <div class="stc-val">{{ fmtMins(u.slowestResponseMinutes) }}</div>
                      <div class="stc-lbl">{{ 'rep.slowResponse' | t }}</div>
                    </div>
                  </div>
                }
                @if (u.avgResolutionHours != null) {
                  <div class="su-time-card stc-blue">
                    <div class="stc-icon">✅</div>
                    <div class="stc-body">
                      <div class="stc-val">{{ fmtHours(u.avgResolutionHours) }}</div>
                      <div class="stc-lbl">{{ 'rep.avgResolution' | t }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Breakdown pies -->
            <div class="rep-section">
              <h3>{{ 'rep.distributions' | t }}</h3>
              <div class="rep-pies">
                <div><h4>{{ 'rep.byStatus' | t }}</h4><app-pie-chart [data]="toPie(u.breakdown.byStatus, statusColors)"></app-pie-chart></div>
                <div><h4>{{ 'rep.byPriority' | t }}</h4><app-pie-chart [data]="toPie(u.breakdown.byPriority, prioColors)"></app-pie-chart></div>
                <div><h4>{{ 'rep.byType' | t }}</h4><app-pie-chart [data]="toPie(u.breakdown.byType)"></app-pie-chart></div>
              </div>
            </div>

            <!-- Monthly trend bar -->
            <div class="rep-section">
              <h3>{{ 'rep.monthlyTrend' | t }}</h3>
              <div class="trend-bars">
                @for (p of u.monthlyTrend; track p.label) {
                  <div class="tb-col">
                    <div class="tb-bar-wrap">
                      <div class="tb-bar" [style.height.%]="trendPct(p.count, u.monthlyTrend)" title="{{ p.count }} tickets · {{ p.label }}"></div>
                    </div>
                    <div class="tb-lbl">{{ p.label.split(' ')[0] }}</div>
                    <div class="tb-val">{{ p.count }}</div>
                  </div>
                }
              </div>
            </div>

            <!-- Recent tasks -->
            @if (u.recentTasks.length) {
              <div class="rep-section">
                <h3>{{ 'rep.recentTasks' | t }}</h3>
                <table class="table compact">
                  <thead><tr><th>#</th><th>{{ 'task.title' | t }}</th><th>{{ 'task.status' | t }}</th><th>{{ 'task.priority' | t }}</th><th>{{ 'tc.title' | t }}</th><th>{{ 'task.created' | t }}</th></tr></thead>
                  <tbody>
                    @for (t of u.recentTasks; track t.id) {
                      <tr>
                        <td class="muted">{{ t.id }}</td>
                        <td dir="auto">{{ t.title }}</td>
                        <td><span class="status-chip st-{{ t.status }}">{{ t.status }}</span></td>
                        <td>{{ t.priority }}</td>
                        <td>{{ t.categoryName || '—' }}</td>
                        <td class="muted">{{ t.createdAt | date:'shortDate' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }

        <!-- ════════════════════════════════════════
             NEW: SINGLE TASK PROFILE REPORT
        ════════════════════════════════════════ -->
        @if (mode() === 'single-task') {
          @if (!singleTaskReport()) {
            <div class="empty-prompt">
              <div class="ep-icon">🎫</div>
              <div class="ep-text">{{ 'rep.taskId' | t }}</div>
            </div>
          } @else {
            @let tk = singleTaskReport()!;
            <!-- Lifecycle KPIs -->
            <div class="rep-kpis">
              <div class="rk"><div class="rk-v">{{ tk.subtaskCount }}</div><div class="rk-l">{{ 'rep.subtasks' | t }}</div></div>
              <div class="rk"><div class="rk-v">{{ tk.completedSubtaskCount }}</div><div class="rk-l">{{ 'rep.completed' | t }}</div></div>
              <div class="rk"><div class="rk-v">{{ tk.commentCount }}</div><div class="rk-l">{{ 'rep.comments' | t }}</div></div>
              <div class="rk"><div class="rk-v">{{ tk.attachmentCount }}</div><div class="rk-l">{{ 'rep.attachments' | t }}</div></div>
              @if (tk.minutesToClaim != null) {
                <div class="rk"><div class="rk-v">{{ fmtMins(tk.minutesToClaim) }}</div><div class="rk-l">{{ 'rep.timeToClaim' | t }}</div></div>
              }
              @if (tk.minutesToResolve != null) {
                <div class="rk"><div class="rk-v">{{ fmtMins(tk.minutesToResolve) }}</div><div class="rk-l">{{ 'rep.timeToResolve' | t }}</div></div>
              }
            </div>

            <!-- Ticket metadata -->
            <div class="rep-section">
              <h3>{{ 'rep.taskLifecycle' | t }}</h3>
              <div class="tk-meta-grid">
                <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.status' | t }}</span><span class="status-chip st-{{ tk.status }}">{{ tk.status }}</span></div>
                <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.priority' | t }}</span><span>{{ tk.priority }}</span></div>
                <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.type' | t }}</span><span>{{ tk.type }}</span></div>
                <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.assignee' | t }}</span><span>{{ tk.assigneeName || '—' }}</span></div>
                <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.reporter' | t }}</span><span>{{ tk.reporterName || '—' }}</span></div>
                <div class="tk-meta-row"><span class="tk-lbl">{{ 'tc.title' | t }}</span>
                  @if (tk.categoryName) {
                    <span class="cat-chip" [style.background]="tk.categoryColor ? tk.categoryColor + '18' : ''" [style.color]="tk.categoryColor || ''">{{ tk.categoryIcon }} {{ tk.categoryName }}</span>
                  } @else { <span>—</span> }
                </div>
                @if (tk.projectName) {
                  <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.project' | t }}</span><span>{{ tk.projectName }}</span></div>
                }
                @if (tk.branchName) {
                  <div class="tk-meta-row"><span class="tk-lbl">{{ 'org.branch' | t }}</span><span>{{ tk.branchName }}</span></div>
                }
                <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.created' | t }}</span><span>{{ tk.createdAt | date:'medium' }}</span></div>
                @if (tk.claimedAt) {
                  <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.acceptedIn' | t }}</span><span>{{ tk.claimedAt | date:'medium' }}</span></div>
                }
                @if (tk.completedAt) {
                  <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.completedAt' | t }}</span><span>{{ tk.completedAt | date:'medium' }}</span></div>
                }
                @if (tk.tags) {
                  <div class="tk-meta-row"><span class="tk-lbl">{{ 'task.tags' | t }}</span><span>{{ tk.tags }}</span></div>
                }
              </div>
              @if (tk.description) {
                <div class="tk-desc">{{ tk.description }}</div>
              }
            </div>

            <!-- Subtasks -->
            @if (tk.subtasks.length) {
              <div class="rep-section">
                <h3>{{ 'rep.subtasks' | t }} ({{ tk.subtasks.length }})</h3>
                <table class="table compact">
                  <thead><tr><th>#</th><th>{{ 'task.title' | t }}</th><th>{{ 'task.status' | t }}</th><th>{{ 'task.assignee' | t }}</th></tr></thead>
                  <tbody>
                    @for (s of tk.subtasks; track s.id) {
                      <tr>
                        <td class="muted">{{ s.id }}</td>
                        <td dir="auto">{{ s.title }}</td>
                        <td><span class="status-chip st-{{ s.status }}">{{ s.status }}</span></td>
                        <td>{{ s.assigneeName || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Activity log -->
            <div class="rep-section">
              <h3>{{ 'rep.activityLog' | t }}</h3>
              @if (tk.activity.length === 0) {
                <div class="muted text-sm">{{ 'rep.noActivity' | t }}</div>
              } @else {
                <div class="activity-log">
                  @for (a of tk.activity; track a.id) {
                    <div class="al-row">
                      <div class="al-dot"></div>
                      <div class="al-body">
                        <span class="al-action">{{ a.action }}</span>
                        @if (a.field) { <span class="al-field">{{ a.field }}</span> }
                        @if (a.oldValue && a.newValue) {
                          <span class="al-change">{{ a.oldValue }} → {{ a.newValue }}</span>
                        } @else if (a.newValue) {
                          <span class="al-change">{{ a.newValue }}</span>
                        }
                        <span class="al-meta">{{ a.userName || '—' }} · {{ a.createdAt | date:'short' }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- ════════════════════════════════════════
             NEW: TREND REPORT
        ════════════════════════════════════════ -->
        @if (mode() === 'trend' && trendReport(); as tr) {
          <div class="rep-section">
            <h3>{{ 'rep.last30Days' | t }}</h3>
            <div class="trend-bars trend-bars-30">
              @for (p of tr.last30Days; track p.period) {
                <div class="tb-col tb-col-sm">
                  <div class="tb-bar-wrap">
                    <div class="tb-bar tb-created" [style.height.%]="trendPct(p.created, tr.last30Days, 'created')" title="{{ p.created }} created"></div>
                    <div class="tb-bar tb-done" [style.height.%]="trendPct(p.completed, tr.last30Days, 'created')" title="{{ p.completed }} completed"></div>
                  </div>
                  <div class="tb-lbl">{{ p.period.split(' ')[1] }}</div>
                </div>
              }
            </div>
            <div class="trend-legend">
              <span class="tl-dot tl-created"></span>{{ 'rep.trendCreated' | t }}
              <span class="tl-dot tl-done"></span>{{ 'rep.trendCompleted' | t }}
            </div>
          </div>

          <div class="rep-section">
            <h3>{{ 'rep.last12Months' | t }}</h3>
            <div class="trend-bars">
              @for (p of tr.last12Months; track p.period) {
                <div class="tb-col">
                  <div class="tb-bar-wrap">
                    <div class="tb-bar tb-created" [style.height.%]="trendPct(p.created, tr.last12Months, 'created')"></div>
                    <div class="tb-bar tb-done" [style.height.%]="trendPct(p.completed, tr.last12Months, 'created')"></div>
                  </div>
                  <div class="tb-lbl">{{ p.period.split(' ')[0] }}</div>
                  <div class="tb-val">{{ p.created }}</div>
                </div>
              }
            </div>
            <div class="trend-legend">
              <span class="tl-dot tl-created"></span>{{ 'rep.trendCreated' | t }}
              <span class="tl-dot tl-done"></span>{{ 'rep.trendCompleted' | t }}
            </div>
          </div>
        }

        <!-- ════════════════════════════════════════
             NEW: AGING / SLA REPORT
        ════════════════════════════════════════ -->
        @if (mode() === 'aging' && overdueReport(); as od) {
          <!-- Age buckets -->
          <div class="rep-kpis">
            <div class="rk"><div class="rk-v">{{ od.totalOpen }}</div><div class="rk-l">{{ 'rep.open' | t }}</div></div>
            <div class="rk"><div class="rk-v" [class.danger]="od.over1Day > 0">{{ od.over1Day }}</div><div class="rk-l">{{ 'rep.over1day' | t }}</div></div>
            <div class="rk"><div class="rk-v" [class.danger]="od.over3Days > 0">{{ od.over3Days }}</div><div class="rk-l">{{ 'rep.over3days' | t }}</div></div>
            <div class="rk"><div class="rk-v" [class.danger]="od.over7Days > 0">{{ od.over7Days }}</div><div class="rk-l">{{ 'rep.over7days' | t }}</div></div>
            <div class="rk"><div class="rk-v" [class.danger]="od.over14Days > 0">{{ od.over14Days }}</div><div class="rk-l">{{ 'rep.over14days' | t }}</div></div>
          </div>

          <div class="rep-section">
            <h3>{{ 'rep.agingBuckets' | t }}</h3>
            @if (od.tasks.length === 0) {
              <div class="muted text-sm">{{ 'rep.noOverdue' | t }}</div>
            } @else {
              <table class="table compact">
                <thead>
                  <tr>
                    <th>#</th><th>{{ 'task.title' | t }}</th><th>{{ 'task.status' | t }}</th>
                    <th>{{ 'task.priority' | t }}</th><th>{{ 'task.assignee' | t }}</th>
                    <th>{{ 'tc.title' | t }}</th><th>{{ 'org.branch' | t }}</th>
                    <th>{{ 'rep.daysOpen' | t }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of od.tasks; track r.taskId) {
                    <tr [class.row-warn]="r.daysOpen >= 3 && r.daysOpen < 7"
                        [class.row-danger]="r.daysOpen >= 7">
                      <td class="muted">{{ r.taskId }}</td>
                      <td dir="auto">
                        {{ r.title }}
                        @if (r.isUnassigned) { <span class="badge-unassigned">{{ 'rep.unassignedBadge' | t }}</span> }
                      </td>
                      <td><span class="status-chip st-{{ r.status }}">{{ r.status }}</span></td>
                      <td [class.text-danger]="r.priority === 'Critical' || r.priority === 'High'">{{ r.priority }}</td>
                      <td>{{ r.assigneeName || '—' }}</td>
                      <td>{{ r.categoryName || '—' }}</td>
                      <td>{{ r.branchName || '—' }}</td>
                      <td [class.danger]="r.daysOpen >= 7"><strong>{{ r.daysOpen }}d</strong></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <div class="rep-foot text-xs muted">{{ 'app.confidential' | t }} · {{ 'rep.generated' | t }} {{ generatedAt() | date:'short' }}</div>
      </div>
    }
  </div>
  `
})
export class Reports implements OnInit {
  private reportSvc = inject(ReportService);
  private org       = inject(OrganizationService);
  private userSvc   = inject(UserService);
  private auth      = inject(AuthService);
  i18n              = inject(I18nService);

  readonly DEPT_PALETTE = ['#3b82f6','#8b5cf6','#06b6d4','#22c55e','#f59e0b','#ef4444','#ec4899','#f97316','#10b981','#64748b'];

  mode    = signal<Mode>('overview');
  loading = signal(true);
  areas   = signal<Area[]>([]);
  branches = signal<Branch[]>([]);
  users    = signal<User[]>([]);
  areaId?: number;
  branchId?: number;
  selectedUserId: number | null = null;
  selectedTaskId: number | null = null;
  filterFrom = '';
  filterTo   = '';

  overview       = signal<OverviewReport | null>(null);
  areaReport     = signal<AreaReport | null>(null);
  branchReport   = signal<BranchReport | null>(null);
  tagReport      = signal<ByTagReport | null>(null);
  userReport     = signal<ByUserReport | null>(null);
  groupReport    = signal<ByGroupReport | null>(null);
  deptReport     = signal<ByDepartmentReport | null>(null);
  singleUserReport = signal<SingleUserReport | null>(null);
  singleTaskReport = signal<SingleTaskReport | null>(null);
  allTasksReport   = signal<AllTasksReport | null>(null);
  trendReport      = signal<TrendReport | null>(null);
  overdueReport    = signal<OverdueReport | null>(null);
  expandedDepts    = signal<Set<number>>(new Set());

  isManager = () => this.auth.hasRole('Admin');

  statusColors: Record<string, string> = {
    Backlog: '#94a3b8', ToDo: '#6366f1', InProgress: '#2563eb', InReview: '#eab308',
    Blocked: '#dc2626', Done: '#16a34a', Cancelled: '#cbd5e1'
  };
  prioColors: Record<string, string> = { Low: '#94a3b8', Medium: '#0ea5e9', High: '#f59e0b', Critical: '#dc2626' };

  stats = computed<ReportStats | null>(() => {
    const m = this.mode();
    if (m === 'overview') return this.overview()?.stats ?? null;
    if (m === 'area')     return this.areaReport()?.stats ?? null;
    if (m === 'branch')   return this.branchReport()?.stats ?? null;
    if (m === 'all-tasks') return this.allTasksReport()?.stats ?? null;
    return null;
  });

  breakdown = computed<ReportBreakdown | null>(() => {
    const m = this.mode();
    if (m === 'overview') return this.overview()?.breakdown ?? null;
    if (m === 'area')     return this.areaReport()?.breakdown ?? null;
    if (m === 'branch')   return this.branchReport()?.breakdown ?? null;
    if (m === 'all-tasks') return this.allTasksReport()?.breakdown ?? null;
    return null;
  });

  title = computed(() => {
    const m = this.mode(), ar = this.i18n.dir() === 'rtl';
    if (m === 'overview')     return ar ? 'تقرير نظرة عامة على المنظمة' : 'Organization Overview Report';
    if (m === 'area')         return `${ar ? 'تقرير المنطقة' : 'Area Report'} — ${this.areaReport()?.areaName ?? ''}`;
    if (m === 'branch')       return `${ar ? 'تقرير الفرع' : 'Branch Report'} — ${this.branchReport()?.branchName ?? ''}`;
    if (m === 'tag')          return ar ? 'توزيع المهام حسب الوسم' : 'Tag Distribution Report';
    if (m === 'group')        return ar ? 'أداء التصنيفات' : 'Category Performance Report';
    if (m === 'department')   return ar ? 'أداء الأقسام' : 'Department Performance Report';
    if (m === 'single-user')  return this.singleUserReport() ? `${ar ? 'ملف المستخدم' : 'User Profile'} — ${this.singleUserReport()!.fullName}` : (ar ? 'ملف المستخدم' : 'User Profile Report');
    if (m === 'single-task')  return this.singleTaskReport() ? `${ar ? 'ملف التذكرة' : 'Ticket'} #${this.singleTaskReport()!.taskId} — ${this.singleTaskReport()!.title}` : (ar ? 'ملف التذكرة' : 'Ticket Profile Report');
    if (m === 'all-tasks')    return ar ? 'تقرير جميع التذاكر' : 'All Tickets Report';
    if (m === 'trend')        return ar ? 'تقرير اتجاه التذاكر' : 'Ticket Trend Report';
    if (m === 'aging')        return ar ? 'تقرير التقادم وSLA' : 'Aging / SLA Report';
    return ar ? 'تقرير المستخدمين' : 'User Performance Report';
  });

  generatedAt = computed(() =>
    this.overview()?.generatedAt ?? this.areaReport()?.generatedAt ?? this.branchReport()?.generatedAt
    ?? this.tagReport()?.generatedAt ?? this.userReport()?.generatedAt ?? this.groupReport()?.generatedAt
    ?? this.deptReport()?.generatedAt ?? this.singleUserReport()?.generatedAt
    ?? this.allTasksReport()?.generatedAt ?? this.trendReport()?.generatedAt
    ?? this.overdueReport()?.generatedAt ?? new Date().toISOString());

  ngOnInit() {
    this.org.getAreas().subscribe(a => { this.areas.set(a); if (a.length) this.areaId = a[0].id; });
    this.org.getBranches().subscribe(b => { this.branches.set(b); if (b.length) this.branchId = b[0].id; });
    this.userSvc.getAll().subscribe(u => this.users.set(u));
    this.loadOverview();
  }

  setMode(m: Mode) {
    this.mode.set(m);
    if (m === 'overview')   this.loadOverview();
    else if (m === 'area')  this.loadArea();
    else if (m === 'branch') this.loadBranch();
    else if (m === 'tag')   this.loadTag();
    else if (m === 'user')  this.loadUser();
    else if (m === 'group') this.loadGroup();
    else if (m === 'department') this.loadDept();
    else if (m === 'trend')  this.loadTrend();
    else if (m === 'aging')  this.loadAging();
    else if (m === 'all-tasks') this.loadAllTasks();
    else this.loading.set(false);
  }

  loadOverview() { this.loading.set(true); this.reportSvc.overview().subscribe({ next: r => { this.overview.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadArea()     { if (!this.areaId) return; this.loading.set(true); this.reportSvc.area(this.areaId).subscribe({ next: r => { this.areaReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadBranch()   { if (!this.branchId) return; this.loading.set(true); this.reportSvc.branch(this.branchId).subscribe({ next: r => { this.branchReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadTag()      { this.loading.set(true); this.reportSvc.byTag().subscribe({ next: r => { this.tagReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadUser()     { this.loading.set(true); this.reportSvc.byUser().subscribe({ next: r => { this.userReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadGroup()    { this.loading.set(true); this.reportSvc.byGroup().subscribe({ next: r => { this.groupReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadDept()     { this.loading.set(true); this.expandedDepts.set(new Set()); this.reportSvc.byDepartment().subscribe({ next: r => { this.deptReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadTrend()    { this.loading.set(true); this.reportSvc.trend().subscribe({ next: r => { this.trendReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadAging()    { this.loading.set(true); this.reportSvc.overdue().subscribe({ next: r => { this.overdueReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  loadAllTasks() { this.loading.set(true); this.reportSvc.allTasks(this.filterFrom || undefined, this.filterTo || undefined).subscribe({ next: r => { this.allTasksReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) }); }

  loadSingleUser() {
    if (!this.selectedUserId) return;
    this.loading.set(true);
    this.reportSvc.singleUser(this.selectedUserId, this.filterFrom || undefined, this.filterTo || undefined)
      .subscribe({ next: r => { this.singleUserReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  loadSingleTask() {
    if (!this.selectedTaskId) return;
    this.loading.set(true);
    this.reportSvc.singleTask(this.selectedTaskId)
      .subscribe({ next: r => { this.singleTaskReport.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  toggleDept(id: number) {
    const s = new Set(this.expandedDepts());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expandedDepts.set(s);
  }

  sortedUsers = computed(() =>
    [...(this.userReport()?.users ?? [])].sort((a, b) => b.stats.completionRate - a.stats.completionRate));

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

  fmtMins(mins?: number): string {
    if (mins == null) return '—';
    if (mins < 1) return '< 1m';
    if (mins < 60) return `${Math.round(mins)}m`;
    const h = Math.floor(mins / 60), m = Math.round(mins % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  fmtHours(hours?: number): string {
    if (hours == null) return '—';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  }

  toPie(rows: CountByLabel[], colors?: Record<string, string>): PieSlice[] {
    return rows.map(r => ({ label: r.label, count: r.count, color: colors?.[r.label] }));
  }

  trendPct(val: number, list: any[], key = 'count'): number {
    const max = Math.max(...list.map(p => key === 'count' ? p.count : p[key]), 1);
    return Math.round((val / max) * 100);
  }

  print() { window.print(); }
}
