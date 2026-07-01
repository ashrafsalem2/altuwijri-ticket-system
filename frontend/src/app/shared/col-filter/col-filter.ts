import { Component, computed, signal, HostListener, ElementRef, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';

export interface FilterOption {
  value: any;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-col-filter',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './col-filter.scss',
  template: `
<div class="cf-wrap">
  <button class="cf-btn" type="button"
    (click)="togglePanel($event)"
    [class.cf-active]="hasValue()">
    <span class="cf-lbl">{{ displayLabel() }}</span>
    <span class="cf-arrow" [class.cf-open]="open()">▾</span>
  </button>

  @if (open()) {
    <div class="cf-panel" [class.cf-end]="alignEnd()" (click)="$event.stopPropagation()">
      <div class="cf-search-row">
        <input class="cf-search" type="text" placeholder="🔍"
          [ngModel]="searchText"
          (ngModelChange)="searchText = $event; search.set($event)" />
      </div>
      <div class="cf-list">
        @if (multi()) {
          <div class="cf-item cf-all" (click)="toggleAll(); $event.stopPropagation()">
            <span class="cf-chk"
              [class.cf-chk-on]="allSelected()"
              [class.cf-chk-part]="someSelected() && !allSelected()"></span>
            <span class="cf-item-lbl">{{ allSelected() ? i18n.t('c.clearAll') : i18n.t('c.selectAll') }}</span>
          </div>
          <div class="cf-hr"></div>
        } @else {
          <div class="cf-item" [class.cf-item-sel]="!hasValue()" (click)="selectOne(null)">
            <span class="cf-radio" [class.cf-radio-on]="!hasValue()"></span>
            <span class="cf-item-lbl">{{ placeholder() }}</span>
          </div>
        }
        @for (opt of visibleOpts(); track opt.value) {
          <div class="cf-item" [class.cf-item-sel]="!multi() && value() === opt.value"
            (click)="multi() ? toggleOpt(opt.value) : selectOne(opt.value)">
            @if (multi()) {
              <span class="cf-chk" [class.cf-chk-on]="isChecked(opt.value)"></span>
            } @else {
              <span class="cf-radio" [class.cf-radio-on]="value() === opt.value"></span>
            }
            @if (opt.icon) { <span class="cf-icon">{{ opt.icon }}</span> }
            <span class="cf-item-lbl">{{ opt.label }}</span>
          </div>
        }
        @if (!visibleOpts().length) {
          <div class="cf-empty">—</div>
        }
      </div>
    </div>
  }
</div>
  `
})
export class ColFilter {
  private elRef = inject(ElementRef);
  i18n = inject(I18nService);

  // Inputs
  options  = input<FilterOption[]>([]);
  placeholder = input('All');
  multi    = input(false);
  alignEnd = input(false);   // open panel aligned to right edge (use for last columns)

  // Single-select
  value  = input<any>(null);
  valueChange = output<any>();

  // Multi-select
  values  = input<any[]>([]);
  valuesChange = output<any[]>();

  open       = signal(false);
  search     = signal('');
  searchText = '';

  @HostListener('document:mousedown', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.elRef.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  togglePanel(e: MouseEvent) {
    e.stopPropagation();
    if (!this.open()) { this.search.set(''); this.searchText = ''; }
    this.open.update(v => !v);
  }

  visibleOpts = computed(() => {
    const q = this.search().trim().toLowerCase();
    const opts = this.options();
    return q ? opts.filter(o => o.label.toLowerCase().includes(q)) : opts;
  });

  hasValue = computed(() =>
    this.multi() ? this.values().length > 0 : (this.value() !== null && this.value() !== undefined)
  );

  displayLabel = computed(() => {
    if (this.multi()) {
      const vs = this.values();
      if (!vs.length) return this.placeholder();
      if (vs.length === 1) return this.options().find(o => o.value === vs[0])?.label ?? this.placeholder();
      return `${vs.length} ${this.i18n.t('c.selected')}`;
    }
    const v = this.value();
    if (v === null || v === undefined) return this.placeholder();
    return this.options().find(o => o.value === v)?.label ?? this.placeholder();
  });

  // ── Single-select ───────────────────────────────────────
  selectOne(v: any) {
    this.valueChange.emit(v);
    this.open.set(false);
    this.search.set(''); this.searchText = '';
  }

  // ── Multi-select ────────────────────────────────────────
  isChecked(v: any) { return this.values().includes(v); }

  allSelected = computed(() =>
    this.options().length > 0 && this.options().every(o => this.values().includes(o.value))
  );
  someSelected = computed(() => this.values().length > 0);

  toggleOpt(v: any) {
    const cur = [...this.values()];
    const i = cur.indexOf(v);
    if (i >= 0) cur.splice(i, 1); else cur.push(v);
    this.valuesChange.emit(cur);
  }

  toggleAll() {
    if (this.allSelected()) this.valuesChange.emit([]);
    else this.valuesChange.emit(this.options().map(o => o.value));
  }
}
