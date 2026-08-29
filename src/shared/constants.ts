export const PRODUCT_NAME = '禁忌观察者';
export const DATA_VERSION = 1;
export const MANIFEST_PATH = '.novel/manifest.json';

export const DEFAULT_SETTINGS = {
  autosave: { enabled: true, delayMs: 5_000, saveOnBlur: true },
  recovery: {
    intervalMs: 30_000,
    retentionDays: 30,
    perRepositoryBytes: 500 * 1024 * 1024,
    globalBytes: 2 * 1024 * 1024 * 1024
  },
  observer: {
    mode: 'standard' as 'low' | 'standard' | 'high' | 'manual',
    idleMs: 20_000,
    changedCharacters: 150,
    minimumIntervalMs: 90_000,
    sessionSoftBudget: 40
  },
  navigator: { guidance: 'companion' as 'teaching' | 'companion' | 'free', planning: 'rolling' as 'outline' | 'rolling' | 'exploratory' | 'managed' }
};

export const SUPPORTED_TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt']);
export const PROJECT_FOLDERS = ['manuscript', 'canon', 'planning', 'research', 'decisions'] as const;
