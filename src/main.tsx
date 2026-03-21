import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { InsforgeProvider } from '@insforge/react';
import './index.css';
import App from './App.tsx';
import { insforge } from './lib/insforge';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

function handleAuthChange(user: unknown) {
  if (user) {
    // User just signed in (e.g. returned from hosted auth page)
    // Mark them as wanting to enter the app
    sessionStorage.setItem('inApp', 'true');
  } else {
    // User signed out
    sessionStorage.removeItem('inApp');
  }
}

createRoot(rootElement).render(
  <StrictMode>
    <InsforgeProvider client={insforge} onAuthChange={handleAuthChange}>
      <App />
    </InsforgeProvider>
  </StrictMode>
);
