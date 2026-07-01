import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TicketCategoryService, ExcelService } from '../../core/services/data.services';
import { ImportResult, SaveTicketCategoryRequest, TicketCategory } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

const ICON_PRESETS = [
  '🔧','🌐','💻','🔐','🛡','🐛','✨','⚙️','📞','📋','🖥','🖨','🔌','📡',
  '🔑','🗄','📁','📊','🔒','🚨','⚠️','🎫','👥','🔔','💡','🛠','🧩','📱'
];

@Component({
  selector: 'app-ticket-categories',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  styleUrl: './ticket-categories.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">

    <!-- ── Header ── -->
    <div class="page-header">
      <div class="ph-left">
        <div class="ph-icon">🗂</div>
        <div>
          <h2 class="ph-title">{{ 'tc.title' | t }}</h2>
          <p class="ph-sub">{{ i18n.lang() === 'ar' ? 'إدارة تصنيفات وأنواع التذاكر' : 'Manage ticket categories and groups' }}</p>
        </div>
      </div>
      <div class="flex gap-1 items-center">
        <button class="btn btn-ghost" (click)="xlDownload()">{{ 'xl.export' | t }}</button>
        <label class="btn btn-ghost" [class.loading]="importing()">
          {{ 'xl.import' | t }}
          <input type="file" accept=".xlsx,.xls" style="display:none" (change)="xlImport($event)" />
        </label>
        <button class="btn-new" (click)="openNew()">
          <span class="btn-new-plus">＋</span>
          <span>{{ 'tc.new' | t }}</span>
        </button>
      </div>
    </div>

    @if (importResult()) {
      <div class="tc-import-bar" [class.has-errors]="(importResult()?.failed ?? 0) > 0">
        <span>
          @if ((importResult()?.imported ?? 0) > 0) { ✓ {{ importResult()?.imported }} {{ 'xl.imported' | t }} }
          @if ((importResult()?.updated ?? 0) > 0) { &nbsp;· ✏ {{ importResult()?.updated }} {{ 'xl.updated' | t }} }
          @if ((importResult()?.failed ?? 0) > 0) { &nbsp;· ✗ {{ importResult()?.failed }} {{ 'xl.failed' | t }} }
        </span>
        <button class="btn btn-sm btn-ghost" (click)="importResult.set(null)">✕</button>
      </div>
      @if (importResult()!.errors.length) {
        <div class="card tc-import-errors">
          @for (e of importResult()!.errors; track $index) { <div class="ie-row">{{ e }}</div> }
        </div>
      }
    }

    <!-- ── Cards ── -->
    @if (loading()) {
      <div class="spin"></div>
    } @else {
      <div class="cat-grid">
        @for (cat of categories(); track cat.id) {
          <div class="cat-card" [class.cat-inactive]="!cat.isActive">

            <!-- Colored top strip -->
            <div class="cat-strip" [style.background]="cat.color"></div>

            <div class="cat-body">
              <!-- Icon + Meta -->
              <div class="cat-top">
                <div class="cat-icon-wrap" [style.background]="cat.color + '22'">
                  <span class="cat-icon-emoji">{{ cat.icon }}</span>
                  <div class="cat-color-dot" [style.background]="cat.color"></div>
                </div>
                <div class="cat-meta">
                  <div class="cat-name">{{ (i18n.lang() === 'ar' && cat.nameAr) ? cat.nameAr : cat.name }}</div>
                  <div class="cat-order">
                    {{ i18n.lang() === 'ar' ? 'الترتيب' : 'Order' }} {{ cat.displayOrder }}
                  </div>
                </div>
                <div class="cat-status-chip" [class.chip-active]="cat.isActive" [class.chip-inactive]="!cat.isActive">
                  <span class="chip-dot"></span>
                  {{ cat.isActive ? ('tc.active' | t) : ('c.inactive' | t) }}
                </div>
              </div>

              <!-- Description -->
              <p class="cat-desc">{{ cat.description || (i18n.lang() === 'ar' ? 'لا يوجد وصف' : 'No description') }}</p>

              <!-- Stats -->
              <div class="cat-stats">
                <div class="stat-pill" [style.border-color]="cat.color + '55'">
                  <span class="stat-icon">🎫</span>
                  <span class="stat-num">{{ cat.taskCount }}</span>
                  <span class="stat-lbl">{{ 'tc.tasks' | t }}</span>
                </div>
                <div class="stat-pill" [style.border-color]="cat.color + '55'">
                  <span class="stat-icon">👥</span>
                  <span class="stat-num">{{ cat.technicianCount }}</span>
                  <span class="stat-lbl">{{ 'tc.techs' | t }}</span>
                </div>
              </div>
            </div>

            <!-- Footer actions -->
            <div class="cat-footer" [style.border-top-color]="cat.color + '33'">
              <div class="cat-color-bar" [style.background]="'linear-gradient(to right, ' + cat.color + '18, transparent)'"></div>
              <button class="cat-btn cat-btn-edit" (click)="openEdit(cat)">
                <span>✏</span> {{ 'c.edit' | t }}
              </button>
              <button class="cat-btn cat-btn-del" (click)="del(cat)"
                      [disabled]="cat.taskCount > 0 || cat.technicianCount > 0"
                      [title]="cat.taskCount > 0 || cat.technicianCount > 0
                        ? (i18n.lang() === 'ar' ? 'لا يمكن حذف تصنيف مستخدم' : 'Cannot delete a category in use')
                        : ''">
                <span>✕</span> {{ 'c.delete' | t }}
              </button>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <div class="empty-icon">🗂</div>
            <div class="empty-title">{{ 'tc.empty' | t }}</div>
            <p class="empty-sub">{{ i18n.lang() === 'ar' ? 'أنشئ تصنيفاً لتنظيم تذاكر الدعم' : 'Create a category to organize support tickets' }}</p>
            <button class="btn-new" (click)="openNew()">
              <span class="btn-new-plus">＋</span>
              <span>{{ 'tc.new' | t }}</span>
            </button>
          </div>
        }
      </div>
    }
  </div>

  <!-- ── Modal ── -->
  @if (showForm()) {
    <div class="modal-overlay" (click)="closeForm()">
      <div class="modal-box" (click)="$event.stopPropagation()">

        <div class="modal-head" [style.border-bottom-color]="form.color + '44'">
          <div class="modal-head-left">
            <span class="modal-preview-icon" [style.background]="form.color + '22'">{{ form.icon }}</span>
            <h3>{{ editing() ? ('tc.edit' | t) : ('tc.new' | t) }}</h3>
          </div>
          <button class="btn btn-icon btn-ghost" (click)="closeForm()">✕</button>
        </div>

        @if (error()) {
          <div class="err">{{ error() }}</div>
        }

        <div class="modal-body">
          <!-- Name (EN) + Order -->
          <div class="form-row">
            <div class="form-group fg-grow">
              <label>{{ 'tc.name' | t }} <span class="req">*</span></label>
              <input class="input" [(ngModel)]="form.name" dir="ltr"
                     placeholder="e.g. Technical Support" />
            </div>
            <div class="form-group" style="flex:0 0 90px">
              <label>{{ 'tc.order' | t }}</label>
              <input class="input" type="number" [(ngModel)]="form.displayOrder" min="1" />
            </div>
          </div>

          <!-- Name (AR) -->
          <div class="form-group">
            <label>{{ 'tc.nameAr' | t }}</label>
            <input class="input" [(ngModel)]="form.nameAr" dir="rtl"
                   placeholder="مثال: الدعم التقني" />
          </div>

          <!-- Description -->
          <div class="form-group">
            <label>{{ 'tc.description' | t }}</label>
            <textarea class="input" rows="2" [(ngModel)]="form.description"
                      [placeholder]="i18n.lang() === 'ar' ? 'وصف مختصر للتصنيف...' : 'Brief description of this category…'"></textarea>
          </div>

          <!-- Icon + Color side by side -->
          <div class="form-row">
            <div class="form-group fg-grow">
              <label>{{ 'tc.icon' | t }}</label>
              <div class="icon-preview-wrap">
                <div class="icon-preview-bubble" [style.background]="form.color + '22'">{{ form.icon }}</div>
              </div>
              <div class="icon-grid">
                @for (ic of iconPresets; track ic) {
                  <button class="icon-btn" [class.selected]="form.icon === ic"
                          [style.border-color]="form.icon === ic ? form.color : 'transparent'"
                          [style.background]="form.icon === ic ? form.color + '22' : ''"
                          (click)="form.icon = ic">{{ ic }}</button>
                }
              </div>
            </div>

            <div class="form-group color-col">
              <label>{{ 'tc.color' | t }}</label>
              <input class="color-native" type="color" [(ngModel)]="form.color" />
              <div class="color-presets">
                @for (c of colorPresets; track c) {
                  <button class="color-dot" [style.background]="c"
                          [class.selected]="form.color === c"
                          [style.box-shadow]="form.color === c ? '0 0 0 3px ' + c + '55' : ''"
                          (click)="form.color = c"></button>
                }
              </div>
            </div>
          </div>

          <!-- Default Type -->
          <div class="form-group">
            <label>{{ i18n.lang() === 'ar' ? 'نوع التذكرة الافتراضي' : 'Default Ticket Type' }}</label>
            <select class="input" [(ngModel)]="form.defaultType">
              <option value="Incident">Incident</option>
              <option value="ServiceRequest">Service Request</option>
              <option value="Bug">Bug</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Task">Task</option>
              <option value="Feature">Feature</option>
              <option value="Change">Change</option>
            </select>
          </div>

          <!-- Active toggle -->
          <div class="form-group">
            <label class="toggle-label">
              <div class="toggle-track" [class.on]="form.isActive" [style.background]="form.isActive ? form.color : ''"
                   (click)="form.isActive = !form.isActive">
                <div class="toggle-thumb"></div>
              </div>
              <span>{{ 'tc.active' | t }}</span>
              <span class="toggle-hint">{{ form.isActive
                ? (i18n.lang() === 'ar' ? 'مرئي للمستخدمين' : 'Visible to users')
                : (i18n.lang() === 'ar' ? 'مخفي عن المستخدمين' : 'Hidden from users') }}</span>
            </label>
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="closeForm()">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" [disabled]="saving()" (click)="save()"
                  [style.background]="form.color" [style.border-color]="form.color">
            {{ saving() ? ('c.saving' | t) : ('c.save' | t) }}
          </button>
        </div>
      </div>
    </div>
  }
  `
})
export class TicketCategories implements OnInit {
  private svc = inject(TicketCategoryService);
  private xlSvc = inject(ExcelService);
  toast = inject(ToastService);
  private confirmSvc = inject(ConfirmService);
  i18n = inject(I18nService);

  categories = signal<TicketCategory[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editing = signal<number | null>(null);
  error = signal('');
  importing = signal(false);
  importResult = signal<ImportResult | null>(null);

  readonly iconPresets = ICON_PRESETS;
  readonly colorPresets = ['#3b82f6','#06b6d4','#8b5cf6','#22c55e','#f59e0b','#ef4444','#ec4899','#64748b','#f97316','#10b981'];

  form: { name: string; nameAr: string; description: string; icon: string; color: string; displayOrder: number; isActive: boolean; defaultType: string } = this.blank();

  private blank() {
    return { name: '', nameAr: '', description: '', icon: '🎫', color: '#3b82f6', displayOrder: 1, isActive: true, defaultType: 'ServiceRequest' };
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({ next: d => { this.categories.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openNew() {
    this.editing.set(null);
    this.form = { ...this.blank(), displayOrder: (this.categories().length + 1) };
    this.error.set('');
    this.showForm.set(true);
  }

  openEdit(cat: TicketCategory) {
    this.editing.set(cat.id);
    this.form = { name: cat.name, nameAr: cat.nameAr ?? '', description: cat.description ?? '', icon: cat.icon, color: cat.color, displayOrder: cat.displayOrder, isActive: cat.isActive, defaultType: cat.defaultType ?? 'ServiceRequest' };
    this.error.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  save() {
    if (!this.form.name.trim()) {
      this.error.set(this.i18n.lang() === 'ar' ? 'الاسم مطلوب.' : 'Name is required.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const payload: SaveTicketCategoryRequest = {
      name: this.form.name.trim(),
      nameAr: this.form.nameAr.trim() || undefined,
      description: this.form.description || undefined,
      icon: this.form.icon,
      color: this.form.color,
      displayOrder: this.form.displayOrder,
      isActive: this.form.isActive,
      defaultType: this.form.defaultType
    };
    const id = this.editing();
    const req = id ? this.svc.update(id, payload) : this.svc.create(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: () => { this.saving.set(false); this.error.set(this.i18n.lang() === 'ar' ? 'فشل الحفظ.' : 'Failed to save.'); }
    });
  }

  async del(cat: TicketCategory) {
    const isAr = this.i18n.lang() === 'ar';
    const ok = await this.confirmSvc.ask({
      title: isAr ? 'حذف التصنيف' : 'Delete Category',
      message: isAr ? 'سيتم حذف هذا التصنيف نهائياً.' : 'This category will be permanently removed.',
      detail: cat.name,
      cancelLabel: isAr ? 'إلغاء' : 'Cancel',
      confirmLabel: isAr ? 'حذف' : 'Delete'
    });
    if (!ok) return;
    this.svc.delete(cat.id).subscribe({ next: () => { this.load(); this.toast.success('Category deleted.'); }, error: e => this.toast.error(e?.error?.title ?? 'Delete failed.') });
  }

  xlDownload() { this.xlSvc.downloadExport('ticket-categories'); }
  xlImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importing.set(true);
    this.importResult.set(null);
    this.xlSvc.import('ticket-categories', file).subscribe({
      next: r => { this.importing.set(false); this.importResult.set(r); if (r.imported > 0 || r.updated > 0) this.load(); },
      error: e => { this.importing.set(false); this.toast.error(e?.error?.title ?? 'Import failed.'); }
    });
    (event.target as HTMLInputElement).value = '';
  }
}
