"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './en';
import { id as idDict } from './id';

type Locale = 'en' | 'id';

type I18nContextType = {
  locale: Locale;
  t: (key: string, fallback?: string) => string;
  setLocale: (loc: Locale) => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const DICTS: Record<Locale, Record<string, string>> = {
  en,
  id: idDict,
};

const STORAGE_KEY = 'admin_locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window === 'undefined') return;
    
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) as Locale | null) || null;
      if (saved === 'en' || saved === 'id') setLocaleState(saved);
    } catch {}
  }, []);

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    // Only access localStorage on client side
    if (typeof window === 'undefined') return;
    
    try { localStorage.setItem(STORAGE_KEY, loc); } catch {}
  };

  const dict = DICTS[locale] || en;

  const t = useMemo(() => {
    return (key: string, fallback?: string) => {
      return dict[key] ?? fallback ?? key;
    };
  }, [dict]);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

