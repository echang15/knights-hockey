import { createHash } from 'node:crypto';
import type { Store } from './store';

/** account email -> roster player. Stored in the database (not Cognito) so an admin can change it instantly. */
export interface Link { id: string; email: string; playerId: string }
export const linkId = (email: string) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
export const allLinks = async (store: Store) => (await store.list('links')) as unknown as Link[];
export const linkFor = async (store: Store, email?: string) => (email ? (await allLinks(store)).find((l) => l.id === linkId(email))?.playerId : undefined);
