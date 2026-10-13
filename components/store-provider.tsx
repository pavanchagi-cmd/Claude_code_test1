'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type Me = { user: { name: string | null; role: string; phone: string | null; email: string | null } | null; cartCount: number; wishlist: string[] };

type Toast = { id: number; message: string; tone: 'default' | 'error' };

type StoreCtx = {
  ready: boolean;
  user: Me['user'];
  cartCount: number;
  wishlist: Set<string>;
  addToCart: (variantId: string, qty?: number) => Promise<boolean>;
  toggleWishlist: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
  setCartCount: (n: number) => void;
  toast: (message: string, tone?: Toast['tone']) => void;
};

const Ctx = createContext<StoreCtx | null>(null);
const LOCAL_WISHLIST = 'wishlist:guest';

function readLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_WISHLIST) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function writeLocal(ids: string[]) {
  try {
    localStorage.setItem(LOCAL_WISHLIST, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me['user']>(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'default') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const me = (await res.json()) as Me;
      setUser(me.user);
      setCartCount(me.cartCount);
      if (me.user) {
        const local = readLocal();
        if (local.length) {
          // Merge the guest wishlist into the account after sign-in.
          await fetch('/api/wishlist/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productIds: local }) });
          writeLocal([]);
          setWishlist(new Set([...me.wishlist, ...local]));
        } else setWishlist(new Set(me.wishlist));
      } else setWishlist(new Set(readLocal()));
    } catch {
      setWishlist(new Set(readLocal()));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session/cart fetch
    void refresh();
  }, [refresh]);

  const addToCart = useCallback(
    async (variantId: string, qty = 1) => {
      const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variantId, qty }) });
      const json = (await res.json().catch(() => ({}))) as { error?: string; cartCount?: number; capped?: boolean };
      if (!res.ok) {
        toast(json.error ?? 'Could not add to cart.', 'error');
        return false;
      }
      if (typeof json.cartCount === 'number') setCartCount(json.cartCount);
      toast(json.capped ? 'Added the last available pieces to your cart.' : 'Added to cart');
      return true;
    },
    [toast],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const has = wishlist.has(productId);
      const next = new Set(wishlist);
      if (has) next.delete(productId);
      else next.add(productId);
      setWishlist(next);
      if (user) {
        const res = await fetch('/api/wishlist', {
          method: has ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) {
          setWishlist(wishlist);
          toast('Could not update your wishlist.', 'error');
          return;
        }
      } else writeLocal([...next]);
      toast(has ? 'Removed from wishlist' : 'Saved to wishlist');
    },
    [wishlist, user, toast],
  );

  const value = useMemo(
    () => ({ ready, user, cartCount, wishlist, addToCart, toggleWishlist, refresh, setCartCount, toast }),
    [ready, user, cartCount, wishlist, addToCart, toggleWishlist, refresh, toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto px-5 py-3 text-[15px] font-medium shadow-lg ${t.tone === 'error' ? 'bg-warning text-on-dark' : 'bg-ink text-on-dark'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
