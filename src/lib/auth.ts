const APP_PASSWORD = 'ingenieriasecrets2026';
const AUTH_COOKIE_NAME = 'app_auth_token';
const SALT = 'seplc_security_salt_2026';

function encryptPassword(password: string): string {
  const combined = `${SALT}:${password}:${SALT}`;
  return btoa(combined);
}

function verifyPassword(password: string): boolean {
  return password === APP_PASSWORD;
}

export function setAuthCookie(): void {
  const encrypted = encryptPassword(APP_PASSWORD);
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 6);

  document.cookie = `${AUTH_COOKIE_NAME}=${encrypted}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
}

export function checkAuthCookie(): boolean {
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');

    if (name === AUTH_COOKIE_NAME) {
      try {
        const decrypted = atob(value);
        const parts = decrypted.split(':');

        if (parts.length === 3 && parts[0] === SALT && parts[2] === SALT) {
          return verifyPassword(parts[1]);
        }
      } catch {
        return false;
      }
    }
  }

  return false;
}

export function clearAuthCookie(): void {
  document.cookie = `${AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function attemptLogin(password: string): boolean {
  if (verifyPassword(password)) {
    setAuthCookie();
    return true;
  }
  return false;
}
