/**
 * API base URL — only from env (plus safe default). No dev/prod split:
 * avoids 404s when the dev-server proxy is missing (e.g. craco visual-edits).
 *
 * Set in frontend/.env (restart `yarn start` after changes):
 *   REACT_APP_BACKEND_URL=http://localhost:8000
 *
 * Dev server port is separate: use PORT=3000 in .env (Create React App reads it).
 */
const raw = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
export const BACKEND_URL = String(raw)
  .trim()
  .replace(/\/$/, '')
  .replace(/\/api$/, '');

export const API = `${BACKEND_URL}/api`;
