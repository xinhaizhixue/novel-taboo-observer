const CHINESE_DIGITS: Record<string, number> = {
  '零': 0,
  '〇': 0,
  '一': 1,
  '二': 2,
  '两': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '七': 7,
  '八': 8,
  '九': 9
};

const CHINESE_UNITS: Record<string, number> = { '十': 10, '百': 100, '千': 1_000 };
const ORDINAL = /第([0-9零〇一二两三四五六七八九十百千万]+)(部|卷|册|集|幕|篇|章|回|节)/gu;
const COLLATOR = new Intl.Collator('zh-CN-u-co-pinyin', { numeric: true, sensitivity: 'base' });

function chineseNumber(value: string) {
  if (/^\d+$/u.test(value)) return Number(value);
  if (!/[十百千万]/u.test(value)) {
    const digits = [...value].map((character) => CHINESE_DIGITS[character]);
    return digits.every((digit) => digit !== undefined) ? Number(digits.join('')) : undefined;
  }

  let total = 0;
  let section = 0;
  let digit = 0;
  for (const character of value) {
    if (CHINESE_DIGITS[character] !== undefined) {
      digit = CHINESE_DIGITS[character];
      continue;
    }
    if (character === '万') {
      total += (section + digit) * 10_000;
      section = 0;
      digit = 0;
      continue;
    }
    const unit = CHINESE_UNITS[character];
    if (!unit) return undefined;
    section += (digit || 1) * unit;
    digit = 0;
  }
  return total + section + digit;
}

function sortableSegment(value: string) {
  return value.normalize('NFKC').replace(ORDINAL, (match, rawNumber: string, unit: string) => {
    const parsed = chineseNumber(rawNumber);
    return parsed === undefined || !Number.isFinite(parsed) ? match : `第${String(parsed).padStart(12, '0')}${unit}`;
  });
}

/**
 * Sorts human-authored project paths by their visible ordinal meaning.
 * It understands Arabic and common Chinese ordinals such as 第二卷, 第十卷 and 第一百零二章,
 * while retaining locale-aware natural sorting for every other project name.
 */
export function compareNaturalPath(left: string, right: string) {
  const leftParts = left.split(/[\\/]/u);
  const rightParts = right.split(/[\\/]/u);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    if (leftParts[index] === undefined) return -1;
    if (rightParts[index] === undefined) return 1;
    const compared = COLLATOR.compare(sortableSegment(leftParts[index]), sortableSegment(rightParts[index]));
    if (compared) return compared;
  }
  return COLLATOR.compare(left, right);
}
