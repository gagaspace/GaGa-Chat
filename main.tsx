import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/firebase';

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      // SW registration failed silently in production
    });
  });
}
