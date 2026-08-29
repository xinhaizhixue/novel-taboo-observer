import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { createBrowserWorkbench } from './browser-workbench';
import { AppErrorBoundary, BridgeMissing } from './components/AppErrorBoundary';
import './styles.css';

const isElectron = navigator.userAgent.includes('Electron');
if (!window.workbench && !isElectron) window.workbench = createBrowserWorkbench();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>{window.workbench ? <App /> : <BridgeMissing />}</AppErrorBoundary>
  </StrictMode>
);
document.documentElement.dataset.rendererReady = 'true';
