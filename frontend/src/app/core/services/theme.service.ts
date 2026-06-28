import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'ats-theme';

  theme = signal<'dark' | 'light'>(this.init());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(this.KEY, t);
    });
  }

  private init(): 'dark' | 'light' {
    const saved = localStorage.getItem(this.KEY) as 'dark' | 'light' | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  toggle() {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  isDark = () => this.theme() === 'dark';
}
