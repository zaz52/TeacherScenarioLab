'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AdminAccess } from '@/lib/training/admin-permissions';
export interface SiteAccount {
  authenticated: boolean;
  ownerId: string;
  kind: string;
  roles: string[];
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  passwordConfigured?: boolean;
  adminAccess?: AdminAccess;
}
const Context = createContext<{
  account: SiteAccount | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}>({ account: null, loading: true, error: false, refresh: async () => {} });
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<SiteAccount | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!r.ok) throw Error();
      setAccount(await r.json());
    } catch {
      setAccount(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <Context.Provider value={{ account, loading, error, refresh }}>{children}</Context.Provider>
  );
}
export function useAccount() {
  return useContext(Context);
}
