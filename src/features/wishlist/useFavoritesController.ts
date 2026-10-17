"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { FavoritesController } from "./FavoritesController";
import type { FavoritesTransport } from "./transport";
import type { FavoriteProduct } from "./contract";

export function useFavoritesController(transport: FavoritesTransport, options: {
  confirmed?: (id: string, saved: boolean) => void;
  listed?: (items: FavoriteProduct[]) => void;
  expired?: () => void;
  revision?: number;
  autoLoad?: boolean;
} = {}) {
  const [controller] = useState(() => new FavoritesController(transport, options));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { controller.activate(); return () => controller.dispose(); }, [controller]);
  useEffect(() => { if (options.autoLoad !== false) void controller.load(); }, [controller, options.revision, options.autoLoad]);
  useEffect(() => {
    let last = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now(); controller.tick(now - last); last = now;
    }, 100);
    return () => window.clearInterval(timer);
  }, [controller]);
  return { controller, state };
}
