import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-celebration-overlay',
  standalone: true,
  styleUrl: './celebration-overlay.scss',
  template: `
  @if (show) {
    <div class="anim-overlay celebration-overlay" aria-hidden="true">
      @for (p of pieces; track p.id) {
        <div class="confetti-p"
          [style.left]="p.left"
          [style.width.px]="p.w"
          [style.height.px]="p.h"
          [style.background]="p.color"
          [style.border-radius]="p.br"
          [style.animation-delay]="p.animDelay"
          [style.animation-duration]="p.animDur">
        </div>
      }
      <div class="celebration-msg">🎉&nbsp; Ticket Completed! &nbsp;🎊</div>
    </div>
  }
  `
})
export class CelebrationOverlay {
  @Input() show = false;

  readonly pieces = (() => {
    const colors = ['#008272', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981', '#6366f1', '#f97316', '#84cc16'];
    return Array.from({ length: 34 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${((i * 3.07 + 0.8) % 97 + 1.5).toFixed(1)}%`,
      animDelay: `${(i * 0.09 % 1.25).toFixed(2)}s`,
      animDur: `${(2.5 + (i % 7) * 0.28).toFixed(2)}s`,
      w: 8 + (i % 5) * 2,
      h: i % 3 === 0 ? 8 + (i % 4) * 3 : 5 + (i % 3) * 3,
      br: i % 4 === 0 ? '50%' : '2px'
    }));
  })();
}
