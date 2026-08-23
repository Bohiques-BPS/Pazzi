
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Ensure this uses a relative path
import { BrowserRouter } from 'react-router-dom';
import './index.css'; // Tailwind (build-time) + estilos globales

// Compatibilidad con links viejos que usaban hash (`/#/pay/xxx`): antes de montar el router,
// convertimos `/#/ruta` en `/ruta` para que BrowserRouter la resuelva. Así las facturas/QR ya
// enviadas con `#` siguen funcionando tras quitar el HashRouter.
if (window.location.hash.startsWith('#/')) {
  const path = window.location.hash.slice(1); // "#/pay/x" -> "/pay/x"
  window.history.replaceState(null, '', path + window.location.search);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);