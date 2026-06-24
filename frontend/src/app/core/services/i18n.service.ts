import { Injectable, signal, computed, effect } from '@angular/core';
import { EN, AR, type TKey } from '../models/translations';

export type Language = 'en' | 'ar';

@Injectable({ providedIn: 'root' })
export class I18nService {
  lang = signal<Language>((localStorage.getItem('ats_lang') as Language) ?? 'en');
  dir = computed<'ltr' | 'rtl'>(() => this.lang() === 'ar' ? 'rtl' : 'ltr');
  isRtl = computed(() => this.lang() === 'ar');

  constructor() {
    effect(() => {
      const l = this.lang();
      document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', l);
      document.documentElement.style.setProperty('--font-body',
        l === 'ar' ? "'Cairo', 'Segoe UI', sans-serif" : "'Segoe UI', Roboto, sans-serif");
    });
  }

  toggle() {
    const next: Language = this.lang() === 'en' ? 'ar' : 'en';
    this.lang.set(next);
    localStorage.setItem('ats_lang', next);
  }

  t(key: TKey | string): string {
    const dict = this.lang() === 'ar' ? AR : EN;
    return (dict as Record<string, string>)[key] ?? key;
  }
}
