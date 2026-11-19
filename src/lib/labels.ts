import type { SignatureLabels } from '../types';

/** Built-in signature titles used in printed vouchers and reports. */
export const DEFAULT_SIGNATURE_LABELS: SignatureLabels = {
  receipt: ['المحاسب', 'أمين الصندوق', 'المستلم'],
  expense: ['المستلم', 'أمين الصندوق', 'المدقق المالي'],
  member: ['المحاسب', 'أمين الصندوق', 'عضو الصندوق'],
  report: ['المحاسب', 'أمين الصندوق', 'رئيس مجلس الإدارة'],
};

const KEYS: Array<keyof SignatureLabels> = ['receipt', 'expense', 'member', 'report'];

/** Merges saved labels over the defaults so a partial payload never breaks a printout. */
export function signatureLabels(saved?: Partial<SignatureLabels> | null): SignatureLabels {
  const result = { ...DEFAULT_SIGNATURE_LABELS };
  for (const key of KEYS) {
    const candidate = saved?.[key];
    const defaults = DEFAULT_SIGNATURE_LABELS[key];
    if (!Array.isArray(candidate) || candidate.length !== defaults.length) continue;
    result[key] = defaults.map((fallback, index) => {
      const value = candidate[index];
      return typeof value === 'string' && value.trim() ? value.trim() : fallback;
    });
  }
  return result;
}
