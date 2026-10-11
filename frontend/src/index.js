import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId="347991965006-8s5ub770cc1l0oncif51kvu1oefd0le8.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);

// Service Worker ro'yxatdan o'tkazish
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW ro\'yxatdan o\'tdi:', reg.scope))
      .catch((err) => console.log('SW xatosi:', err));
  });
}