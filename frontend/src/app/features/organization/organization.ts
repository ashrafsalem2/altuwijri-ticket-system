import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationService, ExcelService, DepartmentService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Area, Branch, Department, Device, ImportResult } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

type OrgTab = 'areas' | 'branches' | 'departments';

@Component({
  selector: 'app-organization',
  imports: [FormsModule, TranslatePipe],
  styleUrl: './organization.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">

    <!-- ── Hero header ── -->
    <div class="org-hero">
      <div class="org-hero-left">
        <div class="org-hero-icon">🏢</div>
        <div>
          <h2 class="org-hero-title">{{ 'org.title' | t }}</h2>
          <p class="org-hero-sub">{{ i18n.lang() === 'ar' ? 'إدارة المناطق والفروع والأقسام' : 'Manage areas, branches and departments' }}</p>
        </div>
      </div>
      <div class="org-stats-row">
        <div class="org-stat-pill stat-blue">
          <span class="stat-pill-num">{{ areas().length }}</span>
          <span class="stat-pill-lbl">{{ 'org.areas' | t }}</span>
        </div>
        <div class="org-stat-pill stat-purple">
          <span class="stat-pill-num">{{ branches().length }}</span>
          <span class="stat-pill-lbl">{{ 'org.branches' | t }}</span>
        </div>
        <div class="org-stat-pill stat-cyan">
          <span class="stat-pill-num">{{ departments().length }}</span>
          <span class="stat-pill-lbl">{{ 'dept.title' | t }}</span>
        </div>
      </div>
    </div>

    <!-- ── Tab bar ── -->
    <div class="org-tabs card">
      <button class="org-tab" [class.active]="tab() === 'areas'" (click)="tab.set('areas')">
        <span class="org-tab-icon">🗺</span>
        <span>{{ 'org.areas' | t }}</span>
        <span class="org-tab-badge">{{ areas().length }}</span>
      </button>
      <button class="org-tab" [class.active]="tab() === 'branches'" (click)="tab.set('branches')">
        <span class="org-tab-icon">🏢</span>
        <span>{{ 'org.branches' | t }}</span>
        <span class="org-tab-badge">{{ branches().length }}</span>
      </button>
      <button class="org-tab" [class.active]="tab() === 'departments'" (click)="tab.set('departments')">
        <span class="org-tab-icon">🏷</span>
        <span>{{ 'dept.title' | t }}</span>
        <span class="org-tab-badge">{{ departments().length }}</span>
      </button>
    </div>

    <!-- ══════════ AREAS TAB ══════════ -->
    @if (tab() === 'areas') {
      <div class="tab-section">
        <div class="section-bar">
          <p class="section-bar-hint">{{ i18n.lang() === 'ar' ? 'المناطق الجغرافية التي تنتمي إليها الفروع' : 'Geographic regions that group your branches' }}</p>
          @if (canEdit()) {
            <div class="flex gap-1 items-center">
              <button class="btn btn-ghost btn-sm" (click)="xlAreaDownload()">{{ 'xl.template' | t }}</button>
              <button class="btn btn-ghost btn-sm" [class.loading]="xlAreaImporting()" (click)="areaFileInput.click()">{{ 'xl.import' | t }}</button>
              <input #areaFileInput type="file" accept=".xlsx,.xls" style="display:none" (change)="xlAreaImport($event)" />
              <button class="btn btn-primary btn-sm" (click)="newArea()">＋ {{ 'org.newArea' | t }}</button>
            </div>
          }
        </div>
        @if (xlAreaResult()) {
          <div class="import-bar" [class.has-errors]="(xlAreaResult()?.failed ?? 0) > 0">
            <span>✓ {{ xlAreaResult()?.imported }} {{ 'xl.imported' | t }}
              @if ((xlAreaResult()?.failed ?? 0) > 0) { · ✗ {{ xlAreaResult()?.failed }} {{ 'xl.failed' | t }} }
            </span>
            <button class="btn btn-xs btn-ghost" (click)="xlAreaResult.set(null)">✕</button>
          </div>
          @if (xlAreaResult()!.errors.length) {
            <div class="import-errors">
              @for (e of xlAreaResult()!.errors; track $index) { <div class="ie-row">{{ e }}</div> }
            </div>
          }
        }
        @if (areas().length === 0) {
          <div class="empty-section">
            <div class="empty-icon">🗺</div>
            <div class="empty-title">{{ 'org.noAreas' | t }}</div>
            @if (canEdit()) { <button class="btn btn-primary btn-sm" (click)="newArea()">＋ {{ 'org.newArea' | t }}</button> }
          </div>
        } @else {
          <div class="area-grid">
            @for (a of areas(); track a.id; let i = $index) {
              <div class="area-card" [style.--accent]="PALETTE[i % PALETTE.length]">
                <div class="area-card-accent"></div>
                <div class="area-card-body">
                  <div class="area-card-top">
                    <span class="area-code-chip">{{ a.code }}</span>
                    <span class="area-branch-pill-wrap">
                      <span class="area-branch-pill">🏢 {{ a.branchCount }}</span>
                      @if (a.branchCount > 0) {
                        <div class="branch-tooltip">
                          <div class="branch-tooltip-title">{{ i18n.lang() === 'ar' ? 'الفروع' : 'Branches' }}</div>
                          @for (b of branchesInArea(a.id); track b.id) {
                            <div class="branch-tooltip-item">{{ b.name }}</div>
                          }
                        </div>
                      }
                    </span>
                  </div>
                  <h3 class="area-card-name">{{ a.name }}</h3>
                  <p class="area-card-desc">{{ a.description || (i18n.lang() === 'ar' ? 'لا يوجد وصف' : 'No description') }}</p>
                  @if (canEdit()) {
                    <div class="card-actions">
                      <button class="btn btn-sm btn-ghost" (click)="editArea(a)">{{ 'c.edit' | t }}</button>
                      @if (isAdmin()) {
                        <button class="btn btn-sm btn-danger" (click)="delArea(a)"
                          [disabled]="a.branchCount > 0"
                          [title]="a.branchCount > 0 ? (i18n.lang() === 'ar' ? 'لا يمكن حذف منطقة بها فروع' : 'Cannot delete area with branches') : ''">
                          {{ 'c.delete' | t }}
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- ══════════ BRANCHES TAB ══════════ -->
    @if (tab() === 'branches') {
      <div class="tab-section">
        <div class="section-bar">
          <p class="section-bar-hint">{{ i18n.lang() === 'ar' ? 'مكاتب وفروع المنظمة بتفاصيلها ومعداتها' : 'Office locations with contacts and device inventory' }}</p>
          @if (canEdit()) {
            <div class="flex gap-1 items-center">
              <button class="btn btn-ghost btn-sm" (click)="xlDownload()">{{ 'xl.template' | t }}</button>
              <button class="btn btn-ghost btn-sm" [class.loading]="xlImporting()" (click)="branchFileInput.click()">{{ 'xl.import' | t }}</button>
              <input #branchFileInput type="file" accept=".xlsx,.xls" style="display:none" (change)="xlImport($event)" />
              <button class="btn btn-primary btn-sm" (click)="newBranch()">＋ {{ 'org.newBranch' | t }}</button>
            </div>
          }
        </div>
        @if (xlResult()) {
          <div class="import-bar" [class.has-errors]="(xlResult()?.failed ?? 0) > 0">
            <span>✓ {{ xlResult()?.imported }} {{ 'xl.imported' | t }}
              @if ((xlResult()?.failed ?? 0) > 0) { · ✗ {{ xlResult()?.failed }} {{ 'xl.failed' | t }} }
            </span>
            <button class="btn btn-xs btn-ghost" (click)="xlResult.set(null)">✕</button>
          </div>
          @if (xlResult()!.errors.length) {
            <div class="import-errors">
              @for (e of xlResult()!.errors; track $index) { <div class="ie-row">{{ e }}</div> }
            </div>
          }
        }
        @if (branches().length === 0) {
          <div class="empty-section">
            <div class="empty-icon">🏢</div>
            <div class="empty-title">{{ 'org.noBranches' | t }}</div>
            @if (canEdit()) { <button class="btn btn-primary btn-sm" (click)="newBranch()">＋ {{ 'org.newBranch' | t }}</button> }
          </div>
        } @else {
          <div class="branch-list-grid">
            @for (b of branches(); track b.id; let i = $index) {
              <div class="br-card">
                <div class="br-card-left" [style.background]="PALETTE[i % PALETTE.length] + '18'" [style.border-color]="PALETTE[i % PALETTE.length] + '33'">
                  <div class="br-letter" [style.background]="PALETTE[i % PALETTE.length]">{{ b.name.charAt(0) }}</div>
                </div>
                <div class="br-card-body">
                  <div class="br-card-header">
                    <div>
                      <span class="br-area-chip">{{ b.areaName }}</span>
                      <span class="br-code">{{ b.code }}</span>
                    </div>
                    <div class="flex gap-1">
                      @if (canEdit()) {
                        <button class="btn btn-xs btn-ghost" (click)="editBranch(b)">{{ 'c.edit' | t }}</button>
                        @if (isAdmin()) { <button class="btn btn-xs btn-danger" (click)="delBranch(b)">{{ 'c.delete' | t }}</button> }
                      }
                    </div>
                  </div>
                  <h3 class="br-name">{{ b.name }}</h3>
                  <div class="br-contact">
                    @if (b.address) { <span class="br-contact-item">📍 {{ b.address }}</span> }
                    @if (b.phone)   { <span class="br-contact-item">📞 {{ b.phone }}</span> }
                    @if (b.email)   { <span class="br-contact-item">✉ {{ b.email }}</span> }
                  </div>
                  <div class="br-stats">
                    <div class="br-stat-chip">
                      <span>👤</span>
                      <span class="br-stat-num">{{ b.userCount }}</span>
                      <span class="br-stat-lbl">{{ 'org.users' | t }}</span>
                    </div>
                    <button class="btn btn-xs btn-ghost br-dev-btn" (click)="openDevices(b)">
                      🖥 {{ b.devices?.length ?? 0 }} {{ 'org.devices' | t }}
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- ══════════ DEPARTMENTS TAB ══════════ -->
    @if (tab() === 'departments') {
      <div class="tab-section">
        <div class="section-bar">
          <p class="section-bar-hint">{{ i18n.lang() === 'ar' ? 'الأقسام الوظيفية التي يتبعها الموظفون' : 'Functional divisions that users belong to' }}</p>
          @if (isAdmin()) {
            <div class="flex gap-1 items-center">
              <button class="btn btn-ghost btn-sm" (click)="xlDeptDownload()">{{ 'xl.template' | t }}</button>
              <button class="btn btn-ghost btn-sm" [class.loading]="xlDeptImporting()" (click)="deptFileInput.click()">{{ 'xl.import' | t }}</button>
              <input #deptFileInput type="file" accept=".xlsx,.xls" style="display:none" (change)="xlDeptImport($event)" />
              <button class="btn btn-primary btn-sm" (click)="newDept()">＋ {{ 'dept.new' | t }}</button>
            </div>
          }
        </div>
        @if (xlDeptResult()) {
          <div class="import-bar" [class.has-errors]="(xlDeptResult()?.failed ?? 0) > 0">
            <span>✓ {{ xlDeptResult()?.imported }} {{ 'xl.imported' | t }}
              @if ((xlDeptResult()?.failed ?? 0) > 0) { · ✗ {{ xlDeptResult()?.failed }} {{ 'xl.failed' | t }} }
            </span>
            <button class="btn btn-xs btn-ghost" (click)="xlDeptResult.set(null)">✕</button>
          </div>
          @if (xlDeptResult()!.errors.length) {
            <div class="import-errors">
              @for (e of xlDeptResult()!.errors; track $index) { <div class="ie-row">{{ e }}</div> }
            </div>
          }
        }
        @if (departments().length === 0) {
          <div class="empty-section">
            <div class="empty-icon">🏷</div>
            <div class="empty-title">{{ 'dept.noDepts' | t }}</div>
            @if (isAdmin()) { <button class="btn btn-primary btn-sm" (click)="newDept()">＋ {{ 'dept.new' | t }}</button> }
          </div>
        } @else {
          <div class="dept-grid">
            @for (d of departments(); track d.id; let i = $index) {
              <div class="dept-card">
                <div class="dept-avatar" [style.background]="PALETTE[i % PALETTE.length]">
                  {{ d.name.charAt(0).toUpperCase() }}
                </div>
                <div class="dept-card-body">
                  <div class="dept-card-header">
                    <h3 class="dept-name">{{ d.name }}</h3>
                    @if (d.code) { <span class="dept-code-chip">{{ d.code }}</span> }
                  </div>
                  <p class="dept-desc">{{ d.description || (i18n.lang() === 'ar' ? 'لا يوجد وصف' : 'No description') }}</p>
                  <div class="dept-footer">
                    <span class="dept-user-pill" [style.background]="PALETTE[i % PALETTE.length] + '1a'" [style.color]="PALETTE[i % PALETTE.length]">
                      👤 {{ d.userCount }} {{ 'dept.users' | t }}
                    </span>
                    @if (isAdmin()) {
                      <div class="flex gap-1">
                        <button class="btn btn-xs btn-ghost" (click)="editDept(d)">{{ 'c.edit' | t }}</button>
                        <button class="btn btn-xs btn-danger" (click)="delDept(d)"
                          [disabled]="d.userCount > 0"
                          [title]="d.userCount > 0 ? (i18n.lang() === 'ar' ? 'لا يمكن حذف قسم به مستخدمون' : 'Cannot delete a department with users') : ''">
                          {{ 'c.delete' | t }}
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    }
  </div>

  <!-- ══════════ MODALS ══════════ -->

  <!-- Area modal -->
  @if (areaForm()) {
    <div class="overlay" (click)="areaForm.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head" style="border-bottom-color: #3b82f644">
          <div class="modal-head-left">
            <span class="modal-icon" style="background:#3b82f618">🗺</span>
            <h3>{{ editing ? ('org.editArea' | t) : ('org.newArea' | t) }}</h3>
          </div>
          <button class="btn btn-icon btn-ghost" (click)="areaForm.set(false)">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="field"><label>{{ 'org.name' | t }} *</label><input class="input" [(ngModel)]="am.name" /></div>
            <div class="field"><label>{{ 'org.code' | t }} *</label><input class="input" [(ngModel)]="am.code" [disabled]="editing" /></div>
          </div>
          <div class="field"><label>{{ 'org.desc' | t }}</label><textarea class="input" rows="2" [(ngModel)]="am.description"></textarea></div>
          @if (error()) { <div class="err">{{ error() }}</div> }
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="areaForm.set(false)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="saveArea()">{{ 'c.save' | t }}</button>
        </div>
      </div>
    </div>
  }

  <!-- Branch modal -->
  @if (branchForm()) {
    <div class="overlay" (click)="branchForm.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head" style="border-bottom-color: #8b5cf644">
          <div class="modal-head-left">
            <span class="modal-icon" style="background:#8b5cf618">🏢</span>
            <h3>{{ editing ? ('org.editBranch' | t) : ('org.newBranch' | t) }}</h3>
          </div>
          <button class="btn btn-icon btn-ghost" (click)="branchForm.set(false)">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="field"><label>{{ 'org.name' | t }} *</label><input class="input" [(ngModel)]="bm.name" /></div>
            <div class="field"><label>{{ 'org.code' | t }} *</label><input class="input" [(ngModel)]="bm.code" [disabled]="editing" /></div>
          </div>
          <div class="field"><label>{{ 'org.area' | t }} *</label>
            <select [(ngModel)]="bm.areaId">
              @for (a of areas(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
            </select>
          </div>
          <div class="form-row">
            <div class="field"><label>{{ 'org.address' | t }}</label><input class="input" [(ngModel)]="bm.address" /></div>
            <div class="field"><label>{{ 'org.phone' | t }}</label><input class="input" [(ngModel)]="bm.phone" /></div>
          </div>
          <div class="field"><label>{{ 'org.email' | t }}</label><input class="input" type="email" [(ngModel)]="bm.email" placeholder="branch@example.com" /></div>
          @if (error()) { <div class="err">{{ error() }}</div> }
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="branchForm.set(false)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="saveBranch()">{{ 'c.save' | t }}</button>
        </div>
      </div>
    </div>
  }

  <!-- Department modal -->
  @if (deptFormOpen()) {
    <div class="overlay" (click)="deptFormOpen.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head" style="border-bottom-color: #06b6d444">
          <div class="modal-head-left">
            <span class="modal-icon" style="background:#06b6d418">🏷</span>
            <h3>{{ editingDept ? ('dept.edit' | t) : ('dept.new' | t) }}</h3>
          </div>
          <button class="btn btn-icon btn-ghost" (click)="deptFormOpen.set(false)">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="field"><label>{{ 'dept.name' | t }} *</label><input class="input" [(ngModel)]="dm2.name" /></div>
            <div class="field"><label>{{ 'dept.code' | t }}</label><input class="input" [(ngModel)]="dm2.code" /></div>
          </div>
          <div class="field"><label>{{ 'dept.desc' | t }}</label><textarea class="input" rows="2" [(ngModel)]="dm2.description"></textarea></div>
          @if (deptError()) { <div class="err">{{ deptError() }}</div> }
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="deptFormOpen.set(false)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="saveDept()">{{ 'c.save' | t }}</button>
        </div>
      </div>
    </div>
  }

  <!-- Devices panel -->
  @if (devicesPanel()) {
    <div class="overlay" (click)="devicesPanel.set(false)">
      <div class="modal modal-lg card" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div class="modal-head-left">
            <span class="modal-icon" style="background:#f1f5f9">🖥</span>
            <div>
              <h3>{{ activeBranch()?.name }}</h3>
              <p style="font-size:.75rem;color:var(--text-muted);margin:0">{{ 'org.devices' | t }}</p>
            </div>
          </div>
          <button class="btn btn-icon btn-ghost" (click)="devicesPanel.set(false)">✕</button>
        </div>
        <div class="modal-body">
          @if (canEdit()) {
            <button class="btn btn-primary btn-sm mb-1" (click)="newDevice()">＋ {{ 'org.newDevice' | t }}</button>
          }
          @if ((activeBranch()?.devices?.length ?? 0) === 0) {
            <div class="empty-section" style="padding:2rem 0">
              <div class="empty-icon">🖥</div>
              <div class="empty-title">{{ 'org.noDevices' | t }}</div>
            </div>
          } @else {
            <div class="device-list">
              @for (d of activeBranch()?.devices; track d.id) {
                <div class="device-row">
                  <div class="device-icon">🖥</div>
                  <div class="device-info">
                    <span class="device-label">{{ d.label }}</span>
                    <code class="anydesk-num">{{ d.anyDeskNumber }}</code>
                  </div>
                  <div class="device-creds">
                    <span class="device-cred-item">👤 {{ d.userName }}</span>
                    <span class="device-cred-item">
                      🔑 {{ showPwd[d.id] ? d.password : '••••••' }}
                      <button class="btn btn-icon btn-ghost btn-xs" (click)="togglePwd(d.id)">{{ showPwd[d.id] ? '🙈' : '👁' }}</button>
                    </span>
                    @if (d.notes) { <span class="device-cred-item muted">{{ d.notes }}</span> }
                  </div>
                  @if (canEdit()) {
                    <div class="device-actions">
                      <button class="btn btn-xs btn-ghost" (click)="editDevice(d)">{{ 'c.edit' | t }}</button>
                      <button class="btn btn-xs btn-danger" (click)="delDevice(d)">{{ 'c.delete' | t }}</button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  }

  <!-- Device form -->
  @if (deviceForm()) {
    <div class="overlay overlay-top" (click)="deviceForm.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h3>{{ editingDevice ? ('org.editDevice' | t) : ('org.newDevice' | t) }}</h3>
          <button class="btn btn-icon btn-ghost" (click)="deviceForm.set(false)">✕</button>
        </div>
        <div class="modal-body">
          <div class="field"><label>{{ 'org.deviceLabel' | t }} *</label><input class="input" [(ngModel)]="dm.label" placeholder="Reception PC" /></div>
          <div class="form-row">
            <div class="field"><label>{{ 'org.anydesk' | t }} *</label><input class="input" [(ngModel)]="dm.anyDeskNumber" placeholder="123 456 789" /></div>
            <div class="field"><label>{{ 'org.deviceUser' | t }} *</label><input class="input" [(ngModel)]="dm.userName" /></div>
          </div>
          <div class="field"><label>{{ 'org.devicePwd' | t }} *</label>
            <div class="pwd-input-wrap">
              <input class="input" [type]="showDmPwd ? 'text' : 'password'" [(ngModel)]="dm.password" />
              <button class="btn btn-icon btn-ghost" type="button" (click)="showDmPwd = !showDmPwd">{{ showDmPwd ? '🙈' : '👁' }}</button>
            </div>
          </div>
          <div class="field"><label>{{ 'org.deviceNotes' | t }}</label><textarea class="input" rows="2" [(ngModel)]="dm.notes"></textarea></div>
          @if (devError()) { <div class="err">{{ devError() }}</div> }
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="deviceForm.set(false)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="saveDevice()">{{ 'c.save' | t }}</button>
        </div>
      </div>
    </div>
  }
  `
})
export class Organization implements OnInit {
  private orgSvc  = inject(OrganizationService);
  private deptSvc = inject(DepartmentService);
  private xlSvc   = inject(ExcelService);
  private auth    = inject(AuthService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  private confirmSvc = inject(ConfirmService);

  readonly PALETTE = ['#3b82f6','#8b5cf6','#06b6d4','#22c55e','#f59e0b','#ef4444','#ec4899','#f97316','#10b981','#64748b'];

  tab = signal<OrgTab>('areas');

  areas       = signal<Area[]>([]);
  branches    = signal<Branch[]>([]);
  departments = signal<Department[]>([]);

  xlImporting     = signal(false);
  xlResult        = signal<ImportResult | null>(null);
  xlAreaImporting = signal(false);
  xlAreaResult    = signal<ImportResult | null>(null);
  xlDeptImporting = signal(false);
  xlDeptResult    = signal<ImportResult | null>(null);

  areaForm     = signal(false);
  branchForm   = signal(false);
  devicesPanel = signal(false);
  deviceForm   = signal(false);
  deptFormOpen = signal(false);

  activeBranch = signal<Branch | null>(null);

  editing       = false;
  editId?:       number;
  editingDevice = false;
  editDeviceId?: number;
  editingDept   = false;
  editDeptId?:   number;

  error     = signal('');
  devError  = signal('');
  deptError = signal('');

  am:  any = {};
  bm:  any = {};
  dm:  any = {};
  dm2: any = {};

  showPwd: Record<number, boolean> = {};
  showDmPwd = false;

  canEdit = () => this.auth.hasRole('Admin');
  isAdmin = () => this.auth.hasRole('Admin');

  ngOnInit() { this.load(); }

  load() {
    this.orgSvc.getAreas().subscribe(a => this.areas.set(a));
    this.orgSvc.getBranches().subscribe(b => this.branches.set(b));
    this.deptSvc.getAll().subscribe(d => this.departments.set(d));
  }

  branchesInArea(areaId: number) { return this.branches().filter(b => b.areaId === areaId); }

  // ── Areas ──
  newArea()  { this.editing = false; this.error.set(''); this.am = { name:'', code:'', description:'' }; this.areaForm.set(true); }
  editArea(a: Area) { this.editing = true; this.editId = a.id; this.error.set(''); this.am = { ...a }; this.areaForm.set(true); }
  saveArea() {
    if (!this.am.name?.trim() || (!this.editing && !this.am.code?.trim())) { this.error.set('Name and code are required.'); return; }
    const obs = this.editing && this.editId ? this.orgSvc.updateArea(this.editId, this.am) : this.orgSvc.createArea(this.am);
    obs.subscribe({ next: () => { this.areaForm.set(false); this.load(); }, error: e => this.error.set(e?.error?.title ?? 'Failed.') });
  }
  async delArea(a: Area) {
    const ok = await this.confirmSvc.ask({ title: 'Delete Area', message: 'This area will be permanently removed.', detail: a.name });
    if (!ok) return;
    this.orgSvc.deleteArea(a.id).subscribe({ next: () => { this.load(); this.toast.success('Area deleted.'); }, error: e => this.toast.error(e?.error?.title ?? 'Failed.') });
  }

  // ── Excel areas ──
  xlAreaDownload() { this.xlSvc.downloadTemplate('areas'); }
  xlAreaImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    this.xlAreaImporting.set(true); this.xlAreaResult.set(null);
    this.xlSvc.import('areas', file).subscribe({
      next: r => { this.xlAreaImporting.set(false); this.xlAreaResult.set(r); if (r.imported > 0) this.load(); },
      error: e => { this.xlAreaImporting.set(false); this.toast.error(e?.error?.title ?? 'Import failed.'); }
    });
    (event.target as HTMLInputElement).value = '';
  }

  // ── Branches ──
  newBranch()  {
    this.editing = false; this.error.set('');
    this.bm = { name:'', code:'', areaId: this.areas()[0]?.id, address:'', phone:'', email:'' };
    this.branchForm.set(true);
  }
  editBranch(b: Branch) { this.editing = true; this.editId = b.id; this.error.set(''); this.bm = { ...b }; this.branchForm.set(true); }
  saveBranch() {
    if (!this.bm.name?.trim() || (!this.editing && !this.bm.code?.trim()) || !this.bm.areaId) { this.error.set('Name, code and area are required.'); return; }
    const obs = this.editing && this.editId ? this.orgSvc.updateBranch(this.editId, this.bm) : this.orgSvc.createBranch(this.bm);
    obs.subscribe({ next: () => { this.branchForm.set(false); this.load(); }, error: e => this.error.set(e?.error?.title ?? 'Failed.') });
  }
  async delBranch(b: Branch) {
    const ok = await this.confirmSvc.ask({ title: 'Delete Branch', message: 'This branch will be permanently removed.', detail: b.name });
    if (!ok) return;
    this.orgSvc.deleteBranch(b.id).subscribe({ next: () => { this.load(); this.toast.success('Branch deleted.'); }, error: e => this.toast.error(e?.error?.title ?? 'Failed.') });
  }

  // ── Excel branches ──
  xlDownload() { this.xlSvc.downloadTemplate('branches'); }
  xlImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    this.xlImporting.set(true); this.xlResult.set(null);
    this.xlSvc.import('branches', file).subscribe({
      next: r => { this.xlImporting.set(false); this.xlResult.set(r); if (r.imported > 0) this.load(); },
      error: e => { this.xlImporting.set(false); this.toast.error(e?.error?.title ?? 'Import failed.'); }
    });
    (event.target as HTMLInputElement).value = '';
  }

  // ── Departments ──
  newDept()  { this.editingDept = false; this.deptError.set(''); this.dm2 = { name:'', code:'', description:'' }; this.deptFormOpen.set(true); }
  editDept(d: Department) { this.editingDept = true; this.editDeptId = d.id; this.deptError.set(''); this.dm2 = { ...d }; this.deptFormOpen.set(true); }
  saveDept() {
    if (!this.dm2.name?.trim()) { this.deptError.set('Name is required.'); return; }
    const obs = this.editingDept && this.editDeptId ? this.deptSvc.update(this.editDeptId, this.dm2) : this.deptSvc.create(this.dm2);
    obs.subscribe({ next: () => { this.deptFormOpen.set(false); this.load(); }, error: e => this.deptError.set(e?.error?.title ?? 'Failed.') });
  }
  async delDept(d: Department) {
    const ok = await this.confirmSvc.ask({ title: 'Delete Department', message: 'This department will be permanently removed.', detail: d.name });
    if (!ok) return;
    this.deptSvc.delete(d.id).subscribe({ next: () => { this.load(); this.toast.success('Department deleted.'); }, error: e => this.toast.error(e?.error?.title ?? 'Failed.') });
  }

  // ── Excel departments ──
  xlDeptDownload() { this.xlSvc.downloadTemplate('departments'); }
  xlDeptImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    this.xlDeptImporting.set(true); this.xlDeptResult.set(null);
    this.xlSvc.import('departments', file).subscribe({
      next: r => { this.xlDeptImporting.set(false); this.xlDeptResult.set(r); if (r.imported > 0) this.load(); },
      error: e => { this.xlDeptImporting.set(false); this.toast.error(e?.error?.title ?? 'Import failed.'); }
    });
    (event.target as HTMLInputElement).value = '';
  }

  // ── Devices ──
  openDevices(b: Branch) { this.activeBranch.set(b); this.showPwd = {}; this.devicesPanel.set(true); }
  togglePwd(id: number)  { this.showPwd[id] = !this.showPwd[id]; }

  newDevice() {
    this.editingDevice = false; this.devError.set(''); this.showDmPwd = false;
    this.dm = { label:'', anyDeskNumber:'', userName:'', password:'', notes:'' };
    this.deviceForm.set(true);
  }
  editDevice(d: Device) {
    this.editingDevice = true; this.editDeviceId = d.id; this.devError.set(''); this.showDmPwd = false;
    this.dm = { ...d };
    this.deviceForm.set(true);
  }
  saveDevice() {
    if (!this.dm.label?.trim() || !this.dm.anyDeskNumber?.trim() || !this.dm.userName?.trim() || !this.dm.password) {
      this.devError.set('Label, AnyDesk number, username and password are required.'); return;
    }
    const branchId = this.activeBranch()!.id;
    const obs = this.editingDevice && this.editDeviceId
      ? this.orgSvc.updateDevice(this.editDeviceId, this.dm)
      : this.orgSvc.createDevice({ ...this.dm, branchId });
    obs.subscribe({
      next: () => {
        this.deviceForm.set(false);
        this.orgSvc.getBranches().subscribe(b => {
          this.branches.set(b);
          this.activeBranch.set(b.find(x => x.id === branchId) ?? null);
        });
      },
      error: e => this.devError.set(e?.error?.title ?? 'Failed.')
    });
  }
  async delDevice(d: Device) {
    const ok = await this.confirmSvc.ask({ title: 'Delete Device', message: 'This device will be permanently removed.', detail: d.label });
    if (!ok) return;
    const branchId = this.activeBranch()!.id;
    this.orgSvc.deleteDevice(d.id).subscribe({
      next: () => {
        this.orgSvc.getBranches().subscribe(b => {
          this.branches.set(b);
          this.activeBranch.set(b.find(x => x.id === branchId) ?? null);
        });
      },
      error: e => this.toast.error(e?.error?.title ?? 'Failed.')
    });
  }
}
