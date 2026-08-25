/**
 * StatusMessage.jsx
 * Purpose: Presentational status / empty / error copy. Uses alert role for errors.
 */
export default function StatusMessage({ children, tone = 'status' }) {
  const role = tone === 'error' ? 'alert' : undefined;
  return (
    <p className={`status-message status-message--${tone}`} role={role}>
      {children}
    </p>
  );
}
