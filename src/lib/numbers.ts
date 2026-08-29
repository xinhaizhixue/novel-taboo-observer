export const MIN_TARGET_WAN = 5;
export const MAX_TARGET_WAN = 1_000;

export function parseTargetWanDraft(raw: string) {
  return raw.trim() === '' ? Number.NaN : Number(raw);
}

export function targetWanDraftValue(value: number) {
  return Number.isFinite(value) ? value : '';
}

export function isValidTargetWan(value: number) {
  return Number.isFinite(value) && value >= MIN_TARGET_WAN && value <= MAX_TARGET_WAN;
}

export function clampTargetWan(value: number) {
  if (!Number.isFinite(value)) return MIN_TARGET_WAN;
  return Math.max(MIN_TARGET_WAN, Math.min(MAX_TARGET_WAN, value));
}
