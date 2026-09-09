/**
 * main.jsx
 * Purpose: Mount <App /> in React 18 StrictMode, wrapped in an error boundary
 * so a render crash never leaves a blank white screen.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
