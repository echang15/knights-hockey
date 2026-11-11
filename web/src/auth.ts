import { useSyncExternalStore } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import type { Role } from '../../shared/types';
import { config } from './config';

/**
 * Client-side session. The role shown here only drives what the UI displays; the API re-checks the
 * caller's Cognito group on every request, so editing this state cannot grant access.
 */
const pool = () => new CognitoUserPool({ UserPoolId: config.userPoolId!, ClientId: config.clientId! });
export const isLocalDev = () => !config.userPoolId;

let token: string | null = sessionStorage.getItem('idToken');
let pending: { user: CognitoUser; email: string } | null = null; // mid "set a new password" challenge

function decode(jwt: string | null): { role: Role; email?: string; exp?: number } {
  if (!jwt) return { role: 'guest' };
  try {
    const c = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const g: string[] = Array.isArray(c['cognito:groups']) ? c['cognito:groups'] : [];
    return { role: g.includes('admins') ? 'admin' : g.includes('players') ? 'player' : 'guest', email: c.email, exp: c.exp };
  } catch { return { role: 'guest' }; }
}

const devRole = (): Role => (['guest', 'player', 'admin'].includes(localStorage.getItem('devRole') ?? '') ? (localStorage.getItem('devRole') as Role) : 'admin');

export interface AuthState { role: Role; email?: string; isMember: boolean; isAdmin: boolean }
function compute(): AuthState {
  let d = decode(token);
  if (d.exp && d.exp * 1000 < Date.now()) { token = null; sessionStorage.removeItem('idToken'); d = { role: 'guest' }; }
  const role = isLocalDev() ? devRole() : d.role;
  return { role, email: isLocalDev() ? 'coach@example.com' : d.email, isMember: role !== 'guest', isAdmin: role === 'admin' };
}
let snap = compute();
const subs = new Set<() => void>();
const emit = () => { snap = compute(); subs.forEach((f) => f()); };
export const useAuth = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => snap);

export const authHeader = (): Record<string, string> =>
  token ? { Authorization: token } : isLocalDev() ? { 'x-dev-role': devRole() } : {};

export function setDevRole(r: Role) { localStorage.setItem('devRole', r); emit(); }

function finish(session: { getIdToken(): { getJwtToken(): string } }) {
  token = session.getIdToken().getJwtToken(); sessionStorage.setItem('idToken', token); pending = null; emit();
}

/** Resolves 'ok', or 'new-password' when an invited member must choose a password (call completeNewPassword next). */
export function signIn(email: string, password: string): Promise<'ok' | 'new-password'> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool() });
    user.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
      onSuccess: (s) => { finish(s); resolve('ok'); },
      onFailure: reject,
      newPasswordRequired: () => { pending = { user, email }; resolve('new-password'); },
    });
  });
}

export function completeNewPassword(newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!pending) return reject(new Error('Start sign-in again'));
    pending.user.completeNewPasswordChallenge(newPassword, {}, { onSuccess: (s) => { finish(s); resolve(); }, onFailure: reject });
  });
}

export function signOut() {
  token = null; pending = null; sessionStorage.removeItem('idToken');
  if (!isLocalDev()) try { pool().getCurrentUser()?.signOut(); } catch { /* ignore */ }
  emit();
}
