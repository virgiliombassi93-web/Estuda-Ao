import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import { FirebaseProvider } from './components/FirebaseProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseProvider>
      <App />
      <Analytics />
    </FirebaseProvider>
  </StrictMode>,
);
