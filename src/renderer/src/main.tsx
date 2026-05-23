import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PopupApp from './PopupApp';
import OverlayApp from './OverlayApp';
import './index.css';

// Read query parameter to determine which React application window to render
const urlParams = new URLSearchParams(window.location.search);
const windowType = urlParams.get('window');

/**
 * Tri-window router: Main panel, Floating popup, or Screen selection overlay.
 */
function getWindowComponent() {
  switch (windowType) {
    case 'popup': return <PopupApp />;
    case 'overlay': return <OverlayApp />;
    default: return <App />;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {getWindowComponent()}
  </React.StrictMode>
);
