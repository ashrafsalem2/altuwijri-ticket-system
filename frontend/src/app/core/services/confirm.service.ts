import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'success';
  icon?: string;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  state = signal<ConfirmState | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    const variant = options.variant ?? 'danger';
    return new Promise(resolve => {
      this.state.set({
        confirmLabel: variant === 'danger' ? 'Delete' : 'Confirm',
        cancelLabel: 'Cancel',
        icon: variant === 'danger' ? '🗑' : '✓',
        variant,
        ...options,
        resolve
      });
    });
  }

  respond(value: boolean) {
    const s = this.state();
    if (!s) return;
    this.state.set(null);
    s.resolve(value);
  }
}
