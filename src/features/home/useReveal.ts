"use client";

import { useEffect, useRef } from "react";

/** Marca el elemento como visible al entrar en pantalla (una sola vez). Sin IO, se muestra de inmediato. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") { node.classList.add("is-revealed"); return; }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return ref;
}
