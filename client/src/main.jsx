/**
 * main.jsx
 * Purpose: Mount <App /> in React 18 StrictMode. ErrorBoundary arrives in Card 15.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
