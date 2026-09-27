import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import type { Role } from '../types';
const query = '(max-width: 767px)';
const subscribe = (notify: () => void) => { const media = window.matchMedia(query); media.addEventListener('change', notify); return () => media.removeEventListener('change', notify); };
export function useMobileFieldView(role?: Role) {
  const compact = useSyncExternalStore(subscribe, () => Capacitor.isNativePlatform() || window.matchMedia(query).matches, () => false);
  return compact && !!role && ['CONTRACTOR', 'DEPUTY_ENGINEER', 'PROJECT_MANAGER'].includes(role);
}
