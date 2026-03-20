import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Capture install prompt as early as possible
window.__pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__pwaInstallPrompt = e;
  // Notify any listeners
  window.dispatchEvent(new Event('pwaInstallReady'));
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
