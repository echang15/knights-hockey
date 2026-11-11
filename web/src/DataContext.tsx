import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadAll, type Data } from './api';
import { useAuth } from './auth';

const Ctx = createContext<{ data: Data | null; error: string | null; reload: () => Promise<void> }>({ data: null, error: null, reload: async () => {} });
export const useData = () => useContext(Ctx);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isMember } = useAuth(); // re-fetch on sign-in/out so members-only data appears/disappears
  const reload = useCallback(async () => {
    try { setData(await loadAll(isMember)); setError(null); } catch (e) { setError((e as Error).message); }
  }, [isMember]);
  useEffect(() => { reload(); }, [reload]);
  return <Ctx.Provider value={{ data, error, reload }}>{children}</Ctx.Provider>;
}
