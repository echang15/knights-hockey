export interface AppConfig {
  apiUrl: string;
  /** Present only in deployed environments. Absent => local dev, admin is open. */
  userPoolId?: string;
  clientId?: string;
}
export let config: AppConfig = { apiUrl: '/api' };
export async function loadConfig() {
  try { config = { ...config, ...(await (await fetch('/config.json', { cache: 'no-store' })).json()) }; } catch { /* defaults */ }
}
export const TEAM = { name: 'Knights', full: 'Delaware Knights Hockey', short: 'DEK' };
