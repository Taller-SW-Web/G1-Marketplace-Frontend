import { describe, expect, it, vi } from "vitest";
import { FavoritesController } from "../../src/features/wishlist/FavoritesController";
import { WishlistError } from "../../src/features/wishlist/api";
import type { FavoritesTransport } from "../../src/features/wishlist/transport";
import type { FavoriteProduct, MoveResult } from "../../src/features/wishlist/contract";

const products: FavoriteProduct[] = [1, 2, 3, 4].map(index => ({ productId: `P-${index}`, name: `Producto ${index}`, slug: `producto-${index}`, image: null, availability: "in_stock" }));
const result = (id: string, version = 1): MoveResult => ({ productId: id, cart: { cartId: "cart", version, items: [{ sku: "sku", quantity: version }] } });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function setup(overrides: Partial<FavoritesTransport> = {}) {
  const transport: FavoritesTransport = { list: vi.fn(async () => [...products]), remove: vi.fn(async () => {}), save: vi.fn(async () => {}), move: vi.fn(async id => result(id)), ...overrides };
  const confirmed = vi.fn(), listed = vi.fn(), expired = vi.fn();
  const controller = new FavoritesController(transport, { confirmed, listed, expired });
  return { controller, transport, confirmed, listed, expired };
}

describe("favorites collection state machine", () => {
  it.each(["__proto__", "constructor"])("supports contractual product ID %s without prototype collisions", async id => {
    const { controller, transport } = setup({ list: async () => [{ ...products[0], productId: id }] });
    await controller.load(); await controller.remove(id);
    expect(transport.remove).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().undos[0].product.productId).toBe(id);
  });
  it("does not turn a catalog failure into an empty list and allows recovery", async () => {
    const list = vi.fn().mockRejectedValueOnce(new WishlistError("CATALOG_UNAVAILABLE", 503)).mockResolvedValue(products);
    const { controller } = setup({ list }); await controller.load();
    expect(controller.getSnapshot().status).toBe("error");
    await controller.load(); expect(controller.getSnapshot()).toMatchObject({ status: "ready", items: products });
  });
  it("only offers undo after confirmed DELETE and restores with POST", async () => {
    const deletion = deferred<void>();
    const { controller, transport, confirmed } = setup({ remove: () => deletion.promise }); await controller.load();
    const pending = controller.remove("P-1"); await controller.restore("P-1");
    expect(transport.save).not.toHaveBeenCalled(); expect(controller.getSnapshot().undos).toEqual([]);
    expect(controller.getSnapshot().pending["P-1"]).toBe("removing");
    deletion.resolve(); await pending; expect(confirmed).toHaveBeenCalledWith("P-1", false);
    await controller.restore("P-1"); expect(transport.save).toHaveBeenCalledTimes(1);
    expect(confirmed).toHaveBeenCalledWith("P-1", true);
  });
  it("rolls back only the rejected deletion, preserving a concurrent success", async () => {
    const rejected = deferred<void>(), success = deferred<void>();
    const { controller } = setup({ remove: id => id === "P-1" ? rejected.promise : success.promise }); await controller.load();
    const a = controller.remove("P-1"), b = controller.remove("P-2");
    success.resolve(); await b; rejected.reject(new WishlistError("INTERNAL_ERROR", 500)); await a;
    expect(controller.getSnapshot().items.map(item => item.productId)).toEqual(["P-1", "P-3", "P-4"]);
    expect(controller.getSnapshot().focus?.productId).toBe("P-1");
  });
  it("confirms an uncertain deletion with another idempotent DELETE, never races a restore", async () => {
    const remove = vi.fn().mockRejectedValueOnce(new WishlistError("RESULT_UNCERTAIN", 504)).mockResolvedValue(undefined);
    const { controller, transport } = setup({ remove }); await controller.load(); await controller.remove("P-1");
    expect(controller.getSnapshot().pending["P-1"]).toBe("remove-uncertain");
    await controller.restore("P-1"); expect(transport.save).not.toHaveBeenCalled();
    await controller.remove("P-1", true); expect(remove).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().undos).toHaveLength(1);
  });
  it("pauses undo with interaction and starts queued timers only when visible", async () => {
    const { controller } = setup(); await controller.load();
    for (const product of products) await controller.remove(product.productId);
    controller.pauseUndo("P-1", true); controller.tick(5000);
    expect(controller.getSnapshot().undos.map(item => [item.product.productId, item.remaining])).toEqual([["P-1", 5000], ["P-4", 5000]]);
    controller.pauseUndo("P-1", false); controller.tick(5000); expect(controller.getSnapshot().undos).toEqual([]);
  });
  it("never reports a failed restoration as success", async () => {
    const { controller, confirmed } = setup({ save: async () => { throw new WishlistError("PRODUCT_NOT_AVAILABLE", 404); }, list: async () => [products[0]] });
    await controller.load(); await controller.remove("P-1"); await controller.restore("P-1");
    expect(controller.getSnapshot().items).toEqual([]);
    expect(controller.getSnapshot().notices.at(-1)?.title).toBe("No pudimos restaurar el producto");
    expect(confirmed).not.toHaveBeenCalledWith("P-1", true);
  });
  it("keeps moving items visible, blocks double activation only for that product", async () => {
    const first = deferred<MoveResult>();
    const move = vi.fn((id: string) => id === "P-1" ? first.promise : Promise.resolve(result(id, 2)));
    const { controller } = setup({ move }); await controller.load();
    const a = controller.move("P-1"); await controller.move("P-1"); await controller.remove("P-1");
    expect(move).toHaveBeenCalledTimes(1); expect(controller.getSnapshot().items).toHaveLength(4);
    await controller.move("P-2"); first.resolve(result("P-1", 1)); await a;
    expect(controller.getSnapshot().items.map(item => item.productId)).toEqual(["P-3", "P-4"]);
    expect(controller.getSnapshot().cart?.version).toBe(2);
  });
  it("reuses the same idempotency key after lost response and only removes on replay success", async () => {
    const move = vi.fn().mockRejectedValueOnce(new WishlistError("RESULT_UNCERTAIN", 504)).mockResolvedValue(result("P-1"));
    const { controller } = setup({ move }); await controller.load(); await controller.move("P-1");
    expect(controller.getSnapshot().items).toHaveLength(4);
    expect(controller.getSnapshot().pending["P-1"]).toBe("move-uncertain");
    await controller.remove("P-1"); expect(controller.getSnapshot().items).toHaveLength(4);
    await controller.move("P-1", true);
    expect(move.mock.calls[0][1]).toBe(move.mock.calls[1][1]);
    expect(controller.getSnapshot().items).toHaveLength(3);
  });
  it.each(["VARIANT_SELECTION_REQUIRED", "COMMERCE_DATA_UNAVAILABLE", "STOCK_LIMIT_REACHED", "PRODUCT_NOT_AVAILABLE"])("preserves favorite on %s", async code => {
    const { controller } = setup({ move: async () => { throw new WishlistError(code, code === "VARIANT_SELECTION_REQUIRED" ? 422 : 409, "/productos/producto-1"); } });
    await controller.load(); await controller.move("P-1");
    expect(controller.getSnapshot().items).toHaveLength(4);
    expect(controller.getSnapshot().notices.at(-1)?.kind).not.toBe("success");
  });
  it("ignores old queries after mutation and never resurrects removed products", async () => {
    const oldRead = deferred<FavoriteProduct[]>(); const list = vi.fn().mockResolvedValueOnce(products).mockReturnValueOnce(oldRead.promise);
    const { controller } = setup({ list }); await controller.load(); const query = controller.load(); await controller.remove("P-1");
    oldRead.resolve(products); await query; expect(controller.getSnapshot().items).toHaveLength(3);
  });
  it("purges private data and undo on 401", async () => {
    const { controller, expired } = setup({ move: async () => { throw new WishlistError("UNAUTHORIZED", 401); } });
    await controller.load(); await controller.remove("P-2"); await controller.move("P-1");
    expect(controller.getSnapshot()).toMatchObject({ expired: true, items: [], undos: [], notices: [], pending: {} });
    expect(expired).toHaveBeenCalledOnce();
  });
  it("ignores responses and callbacks after the session container is disposed", async () => {
    const pending = deferred<MoveResult>(); const { controller, confirmed } = setup({ move: () => pending.promise });
    await controller.load(); const moving = controller.move("P-1"); controller.dispose(); pending.resolve(result("P-1")); await moving;
    expect(confirmed).not.toHaveBeenCalled();
  });
});
