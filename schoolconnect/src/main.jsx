import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Diagnostic Runtime Error Catcher
const showError = (title, message, stack) => {
  const errorBox = document.createElement('div');
  errorBox.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#fee2e2;color:#991b1b;padding:30px;font-family:monospace;font-size:16px;z-index:999999;overflow:auto;white-space:pre-wrap;line-height:1.5;';
  errorBox.innerHTML = `<h1>${title}</h1><p><strong>Message:</strong> ${message}</p><pre style="background:#fecaca;padding:15px;border-radius:8px;margin-top:15px;">${stack || 'No stack trace available'}</pre>`;
  document.body.appendChild(errorBox);
};
window.addEventListener('error', (event) => {
  showError('Runtime Error Detected', event.message, event.error?.stack);
});
window.addEventListener('unhandledrejection', (event) => {
  showError('Unhandled Promise Rejection', event.reason?.message || String(event.reason), event.reason?.stack);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
