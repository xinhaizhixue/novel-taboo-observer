export function characters(value: string) {
  return value.replace(/\s/g, '').length;
}

export function relativeTime(value?: string) {
  if (!value) return '刚刚';
  const delta = Date.now() - Date.parse(value);
  if (delta < 60_000) return '刚刚';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
  return new Date(value).toLocaleDateString('zh-CN');
}

export function fileTitle(filePath: string) {
  return filePath.split('/').at(-1)?.replace(/\.(md|markdown|txt)$/i, '') ?? filePath;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
