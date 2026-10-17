"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getSession, mutateItem, WishlistError } from "./api";
import type { Identity, ItemState, Operation, Session } from "./types";
import { getItemState } from "./types";
import type { FavoriteProduct } from "./contract";

type Store = {
  session: Session; sessionBusy: boolean; sessionMessage: string;
  items: Record<string, ItemState>;
  selectIdentity: (identity: Identity) => Promise<void>;
  mutate: (id: string, operation: Operation) => Promise<void>;
  revision: number;
  confirm: (id: string, saved: boolean) => void;
  confirmList: (items: FavoriteProduct[]) => void;
  expireSession: () => void;
};
const Context = createContext<Store | null>(null);

export function WishlistProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [session, setSession] = useState<Session>({ identity: null, scope: "anonymous", enabled });
  const sessionRef = useRef(session);
  const [sessionBusy, setSessionBusy] = useState(enabled);
  const sessionLock = useRef(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const pending = useRef(new Map<string, AbortController>());
  const sessionRequest = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    generation.current++;
    for (const request of pending.current.values()) request.abort();
    pending.current.clear();
    setItems({});
  }, []);

  const syncSession = useCallback(async (identity?: Identity) => {
    if (sessionLock.current && identity === undefined) return;
    if (sessionLock.current) return;
    sessionLock.current = true;
    sessionRequest.current?.abort();
    const controller = new AbortController();
    sessionRequest.current = controller;
    setSessionBusy(true);
    setSessionMessage("");
    if (identity !== undefined) {
      clear();
      sessionRef.current = { identity: null, scope: "anonymous", enabled };
      setSession(sessionRef.current);
    }
    try {
      const next = await getSession(controller.signal, identity);
      if (controller.signal.aborted) return;
      if (next.scope !== sessionRef.current.scope) clear();
      sessionRef.current = next;
      setSession(next);
    } catch (error) {
      if (controller.signal.aborted) return;
      clear();
      sessionRef.current = { identity: null, scope: "anonymous", enabled };
      setSession(sessionRef.current);
      setSessionMessage(error instanceof Error ? error.message : "No pudimos comprobar la sesión de prueba.");
    } finally {
      if (sessionRequest.current === controller) {
        sessionLock.current = false;
        setSessionBusy(false);
      }
    }
  }, [clear, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void syncSession();
    const refresh = () => { void syncSession(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    const requests = pending.current;
    const counter = generation;
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
      sessionRequest.current?.abort();
      sessionLock.current = false;
      counter.current++;
      for (const request of requests.values()) request.abort();
      requests.clear();
    };
  }, [enabled, syncSession]);

  const mutate = useCallback(async (id: string, operation: Operation) => {
    if (!sessionRef.current.identity || sessionLock.current || pending.current.has(id)) return;
    const currentGeneration = generation.current;
    const controller = new AbortController();
    pending.current.set(id, controller);
    setItems(previous => ({ ...previous, [id]: { ...getItemState(previous, id), pending: operation, error: false,
      uncertain: false, retry: undefined, message: operation === "save" ? "Guardando…" : "Quitando…" } }));
    try {
      await mutateItem(id, operation, controller.signal);
      if (currentGeneration !== generation.current) return;
      setItems(previous => ({ ...previous, [id]: { confirmed: operation === "save" ? "saved" : "absent",
        message: operation === "save" ? "Guardado en favoritos." : "Quitado de favoritos." } }));
      setRevision(value => value + 1);
    } catch (error) {
      if (currentGeneration !== generation.current) return;
      if (error instanceof WishlistError && error.status === 401) {
        clear();
        sessionRef.current = { identity: null, scope: "anonymous", enabled };
        setSession(sessionRef.current);
        setSessionMessage(error.message);
      } else {
        setItems(previous => ({ ...previous, [id]: { ...getItemState(previous, id), pending: undefined,
          error: true, uncertain: error instanceof WishlistError && error.code === "RESULT_UNCERTAIN", retry: operation,
          message: error instanceof Error ? error.message : "No pudimos completar la operación." } }));
      }
    } finally {
      if (pending.current.get(id) === controller) pending.current.delete(id);
    }
  }, [clear, enabled]);

  const confirm = useCallback((id: string, saved: boolean) => {
    setItems(previous => ({ ...previous, [id]: { confirmed: saved ? "saved" : "absent" } }));
  }, []);
  const confirmList = useCallback((list: FavoriteProduct[]) => {
    const saved = new Set(list.map(item => item.productId));
    setItems(previous => Object.fromEntries([...new Set([...Object.keys(previous), ...saved])].map(id => [id,
      previous[id]?.pending || previous[id]?.uncertain ? previous[id] : { confirmed: saved.has(id) ? "saved" : "absent" },
    ])));
  }, []);
  const expireSession = useCallback(() => {
    clear();
    sessionRef.current = { identity: null, scope: "anonymous", enabled };
    setSession(sessionRef.current);
    setSessionMessage("Tu sesión terminó. Inicia sesión para volver a consultar tus favoritos.");
  }, [clear, enabled]);

  return <Context.Provider value={{ session, sessionBusy, sessionMessage, items, selectIdentity: syncSession, mutate, revision, confirm, confirmList, expireSession }}>{children}</Context.Provider>;
}

export function useWishlist() {
  const store = useContext(Context);
  if (!store) throw new Error("WishlistProvider is required");
  return store;
}
