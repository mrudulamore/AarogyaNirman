import { useTranslation } from 'react-i18next';
import i18n from './index';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import messages from './locales/interface.json';

const dictionaries: Record<string, Map<string, string>> = { hi: new Map(), mr: new Map() };
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
function indexExisting(source: Record<string, unknown>, translated: Record<string, unknown>, target: Map<string, string>) {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string' && typeof translated[key] === 'string') target.set(normalize(value), translated[key]);
    else if (value && typeof value === 'object' && translated[key] && typeof translated[key] === 'object') indexExisting(value as Record<string, unknown>, translated[key] as Record<string, unknown>, target);
  }
}
indexExisting(en, hi, dictionaries.hi);
indexExisting(en, mr, dictionaries.mr);
for (const language of ['hi', 'mr'] as const) {
  for (const section of ['status', 'roles'] as const) {
    for (const [code, source] of Object.entries(en[section])) {
      const translated = dictionaries[language].get(normalize(source));
      if (translated) {
        dictionaries[language].set(normalize(code), translated);
        dictionaries[language].set(normalize(code.replaceAll('_', ' ')), translated);
      }
    }
  }
}
for (const [source, translations] of Object.entries(messages)) {
  dictionaries.hi.set(normalize(source), translations[0]);
  dictionaries.mr.set(normalize(source), translations[1]);
}

/** Exact interface-message lookup. Never changes identifiers or translates words inside records. */
export function uiText<T>(value: T): T {
  if (typeof value !== 'string') return value;
  const dictionary = dictionaries[i18n.resolvedLanguage ?? i18n.language];
  if (!dictionary) return value;
  const translated = dictionary.get(normalize(value)) ?? (/^[A-Z_ ]+$/.test(value) ? dictionary.get(normalize(value.replaceAll('_', ' '))) : undefined);
  if (!translated) return value;
  return (value.match(/^\s*/)?.[0] + translated + value.match(/\s*$/)?.[0]) as T;
}

export function useUiLanguage() {
  return useTranslation().i18n.resolvedLanguage;
}

export function uiMessage(pattern: string, values: unknown[]): string {
  return uiText(pattern).replace(/\{\{(\d+)\}\}/g, (_, index) => String(values[Number(index)] ?? ''));
}
