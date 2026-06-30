import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  styleUrl: './toast-container.scss',
  template: `
  <div class="toast-stack" aria-live="polite">
    @for (t of toast.toasts(); track t.id) {
      <div class="toast" [class]="'toast-' + t.type" (click)="toast.dismiss(t.id)">
        <span class="toast-icon">
          @switch (t.type) {
            @case ('success') { ✓ }
            @case ('error') { ✕ }
            @default { ⓘ }
          }
        </span>
        <span class="toast-msg">{{ t.message }}</span>
        <button class="toast-close" (click)="toast.dismiss(t.id); $event.stopPropagation()">✕</button>
      </div>
    }
  </div>
  `
})
export class ToastContainer {
  toast = inject(ToastService);
}
