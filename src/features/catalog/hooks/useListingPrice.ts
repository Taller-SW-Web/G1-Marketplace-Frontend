"use client";

import { useEffect, useRef, useState } from "react";
import { fetchProductPrice } from "../services/product-price.service";
import { fetchProductVariants } from "../services/product-variants.service";
import type { PriceDTO } from "../types/product-price.types";

const MAX_ACTIVE = 4;
const MAX_CACHED = 96;
const FRESH_MS = 120_000;
const PENDING_MS = 20_000;

type ListingPrice = { price: PriceDTO; onlySku?: string };
type CacheEntry = { result: Promise<ListingPrice | null>; until?: number };
const cache = new Map<string, CacheEntry>();
const queue: Array<() => void> = [];
let active = 0;

function runNext() {
  while (active < MAX_ACTIVE && queue.length > 0) {
    active += 1;
    queue.shift()!();
  }
}

async function readPrice(slug: string, productId: string) {
  const { data } = await fetchProductVariants(slug, AbortSignal.timeout(8_000));
  const variant = data.hasVariants ? data.variants[0] : undefined;
  if (!variant || data.productId !== productId) return null;
  const { data: result } = await fetchProductPrice(slug, variant.sku, AbortSignal.timeout(8_000));
  if (result.productId !== productId || result.sku !== variant.sku) return null;
  return { price: result.price, ...(data.variants.length === 1 ? { onlySku: variant.sku } : {}) };
}

/** Una lectura en curso por producto. Cada trabajo tiene una sola petición activa. */
export function loadListingPrice(slug: string, productId: string) {
  const key = JSON.stringify([slug, productId]);
  const saved = cache.get(key);
  if (saved && (saved.until === undefined || saved.until > Date.now())) return saved.result;

  cache.delete(key);
  const entry: CacheEntry = {
    result: new Promise((resolve) => {
      queue.push(() => {
        void readPrice(slug, productId).catch(() => null).then((listing) => {
          const price = listing?.price;
          const now = Date.now();
          const saleEnd = price?.saleAmount !== null && price?.validUntil
            ? Date.parse(price.validUntil)
            : Infinity;
          entry.until = Math.min(now + (price ? FRESH_MS : PENDING_MS), saleEnd);
          for (const [oldKey, oldEntry] of cache) {
            if (cache.size <= MAX_CACHED) break;
            if (oldEntry.until !== undefined) cache.delete(oldKey);
          }
          resolve(listing);
        }).finally(() => {
          active -= 1;
          runNext();
        });
      });
    }),
  };
  cache.set(key, entry);
  runNext();
  return entry.result;
}

export type ListingPriceState =
  | { kind: "loading" }
  | { kind: "pending" }
  | ({ kind: "ready" } & ListingPrice);
const LOADING: ListingPriceState = { kind: "loading" };
const PENDING: ListingPriceState = { kind: "pending" };

export function useListingPrice(slug: string, productId: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ slug: string; productId: string; state: ListingPriceState }>();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let mounted = true;
    const start = () => {
      void loadListingPrice(slug, productId).then((listing) => {
        if (mounted) setResult({ slug, productId, state: listing ? { kind: "ready", ...listing } : PENDING });
      });
    };
    if (typeof IntersectionObserver === "undefined") {
      start();
      return () => { mounted = false; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      start();
    });
    observer.observe(element);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [productId, slug]);

  const state = result?.slug === slug && result.productId === productId ? result.state : LOADING;
  return { ref, state };
}
