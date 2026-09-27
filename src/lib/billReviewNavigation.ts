/** Preserve the originating list (including filters) when opening a bill review. */
export function billReviewQuery(billId: string): string {
  return `&bill=${encodeURIComponent(billId)}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`;
}

export function billReviewReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  const url = new URL(value, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  // Review entry points are internal lists; never bounce into another bill dialog.
  if ((url.searchParams.has('bill') || url.searchParams.has('defect'))) return null;
  return url.pathname + url.search + url.hash;
}

export function defectReviewQuery(defectId: string): string {
  return '&defect=' + encodeURIComponent(defectId) + '&returnTo=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
}
