import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';

export interface PieSlice { label: string; count: number; color?: string; }

const DEFAULT_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b', '#0ea5e9', '#84cc16'];

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  styleUrl: './pie-chart.scss',
  template: `
  <div class="pie-wrap">
    <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" class="pie">
      @if (total() === 0) {
        <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="radius" fill="none" stroke="var(--border)" [attr.stroke-width]="thickness" />
      } @else {
        @for (s of segments(); track s.label) {
          <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="radius" fill="none"
            [attr.stroke]="s.color" [attr.stroke-width]="thickness"
            [attr.stroke-dasharray]="s.dash" [attr.stroke-dashoffset]="s.offset"
            [attr.transform]="'rotate(-90 ' + size/2 + ' ' + size/2 + ')'" class="seg clickable"
            (click)="sliceClick.emit(s.label)" />
        }
      }
      <text [attr.x]="size/2" [attr.y]="size/2 - 4" text-anchor="middle" class="pie-total">{{ total() }}</text>
      <text [attr.x]="size/2" [attr.y]="size/2 + 14" text-anchor="middle" class="pie-cap">total</text>
    </svg>
    <div class="legend">
      @for (s of segments(); track s.label) {
        <div class="leg-item clickable" (click)="sliceClick.emit(s.label)">
          <span class="leg-dot" [style.background]="s.color"></span>
          <span class="leg-lbl">{{ s.label }}</span>
          <span class="leg-val">{{ s.count }} ({{ s.pct }}%)</span>
        </div>
      }
    </div>
  </div>
  `
})
export class PieChart {
  @Input() set data(value: PieSlice[]) { this._data.set(value ?? []); }
  @Input() size = 160;
  @Input() thickness = 26;
  @Output() sliceClick = new EventEmitter<string>();

  private _data = signal<PieSlice[]>([]);
  get radius() { return (this.size - this.thickness) / 2; }

  total = computed(() => this._data().reduce((a, b) => a + b.count, 0));

  segments = computed(() => {
    const items = this._data().filter(d => d.count > 0);
    const total = this.total();
    const circumference = 2 * Math.PI * this.radius;
    let acc = 0;
    return items.map((d, i) => {
      const frac = total ? d.count / total : 0;
      const len = frac * circumference;
      const seg = {
        label: d.label,
        count: d.count,
        color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        pct: Math.round(frac * 100),
        dash: `${len} ${circumference - len}`,
        offset: -acc
      };
      acc += len;
      return seg;
    });
  });
}
