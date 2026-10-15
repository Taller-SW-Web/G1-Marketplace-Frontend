"use client";
import { useEffect, useState } from "react";
import { CatalogRequestError, readCatalog } from "./api";
import type { QueryState } from "./types";

export function useCatalog<T>(
  path: string,
  validate: (value: unknown) => value is T,
) {
  const [result, setResult] = useState<{ key: string; state: QueryState<T> }>({
    key: path,
    state: { status: "loading" },
  });
  const [attempt, setAttempt] = useState(0);
  const key = `${path}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    readCatalog(path, validate, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted)
          setResult({ key, state: { status: "ready", ...result } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          state: {
            status: "error",
            code:
              error instanceof CatalogRequestError
                ? error.code
                : "CATALOG_UNAVAILABLE",
            message:
              error instanceof CatalogRequestError
                ? error.message
                : "No pudimos cargar el catálogo. Inténtalo nuevamente.",
          },
        });
      });
    return () => controller.abort();
  }, [path, key, validate]);
  return {
    state:
      result.key === key
        ? result.state
        : ({ status: "loading" } as QueryState<T>),
    retry: () => setAttempt((value) => value + 1),
  };
}
