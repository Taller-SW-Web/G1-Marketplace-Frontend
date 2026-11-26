import { CatalogRequestError, isHome, readCatalog } from "./api";
import type { CatalogSource, HomeDTO } from "./types";

type HomeResult = { data: HomeDTO; source: CatalogSource };
type Pending = { controller: AbortController; result: Promise<HomeResult>; subscribers: number };
let pending: Pending | undefined;

/** Share simultaneous Header/Home reads only. Settled responses are never cached. */
export async function readHomeShared<T>(validate: (value: unknown) => value is T, signal: AbortSignal): Promise<{ data: T; source: CatalogSource }> {
  signal.throwIfAborted();
  if (!pending) {
    const controller = new AbortController();
    const entry: Pending = { controller, subscribers: 0, result: readCatalog("home", isHome, controller.signal) };
    entry.result = entry.result.finally(() => { if (pending === entry) pending = undefined; });
    pending = entry;
  }
  const entry = pending;
  entry.subscribers++;
  const value = await new Promise<HomeResult>((resolve, reject) => {
    let settled = false;
    const finish = (done: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      entry.subscribers--;
      if (entry.subscribers === 0 && pending === entry) { pending = undefined; entry.controller.abort(); }
      done();
    };
    const abort = () => finish(() => reject(new DOMException("Aborted", "AbortError")));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    entry.result.then(result => finish(() => resolve(result)), error => finish(() => reject(error)));
  });
  if (!validate(value.data)) throw new CatalogRequestError("INVALID_RESPONSE", "No pudimos cargar el catálogo. Inténtalo nuevamente.");
  return { data: value.data, source: value.source };
}
