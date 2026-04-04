const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

export function migrateTokensFromLocalStorage() {
  [ACCESS, REFRESH].forEach((key) => {
    const v = localStorage.getItem(key);
    if (v && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, v);
      localStorage.removeItem(key);
    }
  });
}

export function getStoredToken(key) {
  migrateTokensFromLocalStorage();
  return sessionStorage.getItem(key);
}

export function setStoredToken(key, value) {
  sessionStorage.setItem(key, value);
  localStorage.removeItem(key);
}

export function clearAuthTokens() {
  [ACCESS, REFRESH].forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}

export { ACCESS as ACCESS_TOKEN_KEY, REFRESH as REFRESH_TOKEN_KEY };
