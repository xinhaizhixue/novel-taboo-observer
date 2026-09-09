import { app, BrowserWindow, shell, dialog, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PRODUCT_NAME } from '../../src/shared/constants.js';
import { WorkbenchController } from './controller.js';
import { ShutdownCoordinator } from './shutdown.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
// Keep the existing development/packaged data locations across the rename.
const developmentData = path.join(app.getPath('appData'), 'novel-observer');
const packagedData = path.join(app.getPath('appData'), '禁忌观察者');
const legacyData = app.isPackaged && existsSync(packagedData) ? packagedData : developmentData;
if (!app.commandLine.hasSwitch('user-data-dir')) app.setPath('userData', legacyData);
app.setName(PRODUCT_NAME);
const iconPath = path.join(currentDir, '../../../assets/icon.png');
let controller: WorkbenchController;
let mainWindow: BrowserWindow | null = null;

const shutdown = new ShutdownCoordinator(
  () => {
    mainWindow?.setEnabled(false);
    return controller?.prepareToClose() ?? Promise.resolve();
  },
  // Defer past the original native close event; a nested quit can be cancelled
  // by that event's preventDefault on macOS.
  () => { setImmediate(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setEnabled(true);
    app.quit();
  }); },
  (error) => {
    console.error('Could not safely close workbench:', error);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setEnabled(true);
    dialog.showMessageBoxSync({ type: 'error', title: `${PRODUCT_NAME} · 未能保存`, message: '未保存内容的恢复副本没有保存成功，窗口已保留。', detail: `${String(error)}\n请保存正文或复制内容后重试关闭。`, buttons: ['返回作品'] });
  }
);

function createWindow() {
  let rendererRecoveryAttempts = 0;
  let rendererVerificationSequence = 0;
  const window = new BrowserWindow({
    title: PRODUCT_NAME,
    icon: iconPath,
    width: 1500,
    height: 960,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#171510',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 17 },
    webPreferences: {
      preload: path.join(currentDir, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Agent and Observer tasks intentionally continue while the author
      // writes in another app or the workbench is occluded. Keep renderer
      // timers and IPC-driven state reconciliation alive in the background.
      backgroundThrottling: false
    }
  });
  const developmentUrl = process.env.VITE_DEV_SERVER_URL;
  const loadRenderer = () => developmentUrl
    ? window.loadURL(developmentUrl)
    : window.loadFile(path.join(currentDir, '../../../dist/index.html'));
  mainWindow = window;
  window.on('closed', () => { mainWindow = null; });
  window.on('close', (event) => {
    if (shutdown.finished) return;
    event.preventDefault();
    void shutdown.request();
  });
  window.webContents.on('preload-error', (_event, preloadPath, error) => console.error(`Preload error (${preloadPath}):`, error));
  window.webContents.on('did-fail-load', (_event, code, description, url) => console.error(`Renderer load failed ${code} ${description}: ${url}`));
  window.webContents.on('render-process-gone', (_event, details) => console.error('Renderer process ended unexpectedly:', details));
  window.webContents.on('console-message', (details) => {
    if (details.level === 'debug') return;
    const source = details.sourceId ? ` (${details.sourceId}:${details.lineNumber})` : '';
    const message = `[renderer:${details.level}] ${details.message}${source}`;
    if (details.level === 'error') console.error(message);
    else if (details.level === 'warning') console.warn(message);
    else console.info(message);
  });
  window.webContents.on('did-finish-load', () => {
    const verificationSequence = ++rendererVerificationSequence;
    setTimeout(() => {
      if (window.isDestroyed() || verificationSequence !== rendererVerificationSequence) return;
      void window.webContents.executeJavaScript("document.documentElement.dataset.rendererReady === 'true'")
        .then((ready) => {
          if (ready || window.isDestroyed()) return;
          if (rendererRecoveryAttempts >= 2) {
            console.error('Renderer bootstrap did not finish after two recovery attempts.');
            return;
          }
          rendererRecoveryAttempts += 1;
          console.warn(`Renderer bootstrap stalled; retrying (${rendererRecoveryAttempts}/2).`);
          return loadRenderer();
        })
        .catch((error) => console.error('Renderer bootstrap verification failed:', error));
    }, 2_000);
  });
  window.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) void shell.openExternal(url); return { action: 'deny' }; });
  void loadRenderer().catch((error) => console.error('Renderer could not be loaded:', error));
  if (process.env.NOVEL_OBSERVER_SCREENSHOT) window.webContents.once('did-finish-load', () => {
    setTimeout(() => void window.webContents.capturePage().then((image) => writeFile(process.env.NOVEL_OBSERVER_SCREENSHOT!, image.toPNG())), 800);
  });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  void app.whenReady().then(() => {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) app.dock?.setIcon(icon);
    app.setAboutPanelOptions({ applicationName: PRODUCT_NAME, applicationVersion: app.getVersion(), iconPath });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: PRODUCT_NAME, submenu: [{ role: 'about', label: `关于${PRODUCT_NAME}` }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit', label: `退出${PRODUCT_NAME}` }] },
      { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
    ]));
    controller = new WorkbenchController(app.getPath('userData'));
    controller.register();
    createWindow();
    app.on('activate', () => { if (!mainWindow && !shutdown.finished) createWindow(); });
  });
  app.on('before-quit', (event) => {
    if (shutdown.finished) return;
    event.preventDefault();
    void shutdown.request();
  });
  app.on('window-all-closed', () => {
    if (!shutdown.finished) void shutdown.request();
    else setImmediate(() => app.quit());
  });
}
