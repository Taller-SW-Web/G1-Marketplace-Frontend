import { afterEach, expect, it, vi } from "vitest";
import { isHome } from "../../src/features/catalog/api";
import { readHomeShared } from "../../src/features/catalog/readHomeShared";

const response = () => Response.json({ categories: [], featuredProducts: [] }, { headers: { "x-catalog-source": "MOCK" } });
afterEach(() => vi.unstubAllGlobals());
it("shares simultaneous Home readers, while a later visit makes a fresh no-store request", async () => {
  let complete!: (value: Response) => void;
  const fetcher = vi.fn((_url, options: RequestInit) => {
    expect(options.cache).toBe("no-store");
    return new Promise<Response>(resolve => { complete = resolve; });
  });
  vi.stubGlobal("fetch", fetcher);
  const a = readHomeShared(isHome, new AbortController().signal);
  const b = readHomeShared(isHome, new AbortController().signal);
  expect(fetcher).toHaveBeenCalledTimes(1);
  complete(response()); await Promise.all([a,b]);
  const later = readHomeShared(isHome, new AbortController().signal);
  expect(fetcher).toHaveBeenCalledTimes(2);
  complete(response()); await later;
});
it("aborting one subscriber does not cancel a remaining Home consumer", async () => {
  let complete!: (value: Response) => void;
  let sharedSignal!: AbortSignal;
  vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => {
    sharedSignal = options.signal!;
    return new Promise<Response>(resolve => { complete = resolve; });
  }));
  const controller = new AbortController();
  const a = readHomeShared(isHome, controller.signal);
  const b = readHomeShared(isHome, new AbortController().signal);
  controller.abort();
  await expect(a).rejects.toMatchObject({ name: "AbortError" });
  expect(sharedSignal.aborted).toBe(false);
  complete(response()); expect((await b).source).toBe("MOCK");
});
it("aborts transport after the last consumer leaves and permits a fresh request", async () => {
  const signals: AbortSignal[] = [];
  const fetcher = vi.fn((_url, options: RequestInit) => {
    signals.push(options.signal!);
    return new Promise<Response>((_resolve, reject) => options.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
  });
  vi.stubGlobal("fetch", fetcher);
  const first = new AbortController(), second = new AbortController();
  const a = readHomeShared(isHome, first.signal), b = readHomeShared(isHome, second.signal);
  first.abort(); second.abort();
  await Promise.allSettled([a,b]);
  expect(signals[0].aborted).toBe(true);
  fetcher.mockImplementationOnce(async () => response());
  await readHomeShared(isHome, new AbortController().signal);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("shares a technical error without turning it into empty data and retries on the next call", async () => {
  const fetcher = vi.fn(async () => Response.json({ code: "CATALOG_UNAVAILABLE" }, { status: 503 }));
  vi.stubGlobal("fetch", fetcher);
  const a = readHomeShared(isHome, new AbortController().signal), b = readHomeShared(isHome, new AbortController().signal);
  for (const result of await Promise.allSettled([a,b])) expect(result.status).toBe("rejected");
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValueOnce(response());
  await readHomeShared(isHome, new AbortController().signal);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
