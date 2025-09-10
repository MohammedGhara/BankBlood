// src/auth.js

/*** TOKEN ***/
export function saveToken(token) {
  localStorage.setItem('token', token);
  window.dispatchEvent(new Event('auth-changed'));
}
export function getToken() {
  return localStorage.getItem('token');
}
export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');   // clear user too
  window.dispatchEvent(new Event('auth-changed'));
}
export function isLoggedIn() {
  return !!getToken();
}

/*** USER ***/
export function saveUser(user) {
  try {
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('auth-changed'));
  } catch {}
}
export function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
