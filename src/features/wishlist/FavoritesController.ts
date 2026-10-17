import { WishlistError } from "./api";
import type { CartSnapshot, FavoriteProduct } from "./contract";
import type { FavoritesTransport } from "./transport";

export type ItemOperation = "removing" | "moving" | "restoring" | "remove-uncertain" | "move-uncertain" | "restore-uncertain";
export type Notice = {
  id: string; kind: "info" | "success" | "error" | "warning"; title: string; message: string;
  productId?: string; action?: "remove" | "restore" | "move" | "variant" | "cart" | "catalog"; redirectUrl?: string;
};
export type Undo = { product: FavoriteProduct; remaining: number; paused: boolean; failed?: boolean; cannotRestore?: boolean };
export type FavoritesState = {
  status: "loading" | "ready" | "error"; items: FavoriteProduct[]; pending: Record<string, ItemOperation>;
  notices: Notice[]; undos: Undo[]; queryError: string; expired: boolean; cart?: CartSnapshot;
  focus?: { productId: string | null; sequence: number };
};
type Hooks = { confirmed?: (id: string, saved: boolean) => void; listed?: (items: FavoriteProduct[]) => void; expired?: () => void };

// A single state machine drives the HTTP container and the isolated demo adapter.
export class FavoritesController {
  private state: FavoritesState = { status: "loading", items: [], pending: Object.create(null), notices: [], undos: [], queryError: "", expired: false };
  private listeners = new Set<() => void>();
  private requests = new Map<string, AbortController>();
  private removed = new Map<string, { product: FavoriteProduct; index: number }>();
  private moveKeys = new Map<string, string>();
  private query?: AbortController;
  private querySequence = 0;
  private epoch = 0;
  private disposed = false;
  private refreshNeeded = false;
  private focusSequence = 0;
  constructor(private transport: FavoritesTransport, private hooks: Hooks = {}) {}
  activate() { this.disposed = false; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(next: Partial<FavoritesState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  private notice(notice: Notice) {
    this.patch({ notices: [...this.state.notices.filter(item => item.id !== notice.id), notice] });
  }
  dismiss = (id: string, returnFocus = false) => { this.patch({ notices: this.state.notices.filter(item => item.id !== id),
    ...(returnFocus ? { focus: { productId: null, sequence: ++this.focusSequence } } : {}) }); };
  private pending(id: string, operation?: ItemOperation) {
    const next: Record<string, ItemOperation> = Object.assign(Object.create(null), this.state.pending);
    if (operation) next[id] = operation; else delete next[id];
    this.patch({ pending: next });
  }
  private focusAfter(id: string, items: FavoriteProduct[]) {
    const index = items.findIndex(item => item.productId === id);
    const neighbor = items[index + 1] ?? items[index - 1];
    return { productId: neighbor?.productId ?? null, sequence: ++this.focusSequence };
  }
  private start(id: string, operation: ItemOperation, retry: boolean) {
    if (this.disposed || this.state.expired || this.requests.has(id) || (!retry && this.state.pending[id])) return null;
    this.epoch++;
    this.query?.abort();
    const request = new AbortController();
    this.requests.set(id, request);
    this.pending(id, operation);
    return request;
  }
  private finish(id: string, request: AbortController) {
    if (this.requests.get(id) === request) this.requests.delete(id);
    if (this.refreshNeeded && !this.requests.size && !this.disposed) { this.refreshNeeded = false; void this.load(); }
  }
  private handleExpired(error: unknown) {
    if (!(error instanceof WishlistError) || error.status !== 401) return false;
    this.query?.abort();
    for (const request of this.requests.values()) request.abort();
    this.requests.clear(); this.removed.clear(); this.moveKeys.clear();
    this.patch({ items: [], undos: [], pending: Object.create(null), notices: [], queryError: "", expired: true, status: "ready", cart: undefined });
    this.hooks.expired?.();
    return true;
  }
  private uncertain(error: unknown) {
    return !(error instanceof WishlistError) || error.code === "RESULT_UNCERTAIN" || error.code === "OPERATION_IN_PROGRESS";
  }
  async load() {
    if (this.disposed || this.state.expired) return;
    if (this.requests.size) { this.refreshNeeded = true; return; }
    this.query?.abort();
    const request = new AbortController(); this.query = request;
    const sequence = ++this.querySequence; const epoch = this.epoch;
    this.patch({ queryError: "", status: this.state.items.length ? "ready" : "loading" });
    try {
      const items = await this.transport.list(request.signal);
      if (request.signal.aborted || this.disposed || sequence !== this.querySequence || epoch !== this.epoch) return;
      // Do not overwrite unresolved mutations with a read that cannot prove their result.
      const unresolved = new Set(Object.keys(this.state.pending));
      const visible = items.filter(item => !this.removed.has(item.productId) && !unresolved.has(item.productId));
      for (const [index, old] of this.state.items.entries()) if (unresolved.has(old.productId)) visible.splice(Math.min(index, visible.length), 0, old);
      this.patch({ items: visible, status: "ready" });
      if (!unresolved.size) this.hooks.listed?.(items);
    } catch (error) {
      if (request.signal.aborted || this.disposed || this.handleExpired(error)) return;
      this.patch({ status: "error", queryError: error instanceof Error ? error.message : "No pudimos cargar tus favoritos." });
    }
  }
  async remove(id: string, retry = false) {
    const item = this.state.items.find(product => product.productId === id) ?? this.removed.get(id)?.product;
    if (!item) return;
    const before = this.state.items;
    const request = this.start(id, "removing", retry); if (!request) return;
    if (!this.removed.has(id)) this.removed.set(id, { product: item, index: before.indexOf(item) });
    this.dismiss(`remove:${id}`);
    this.patch({ items: before.filter(product => product.productId !== id), focus: this.focusAfter(id, before) });
    try {
      await this.transport.remove(id, request.signal);
      if (request.signal.aborted || this.disposed) return;
      this.pending(id);
      this.hooks.confirmed?.(id, false);
      this.patch({ undos: [...this.state.undos.filter(undo => undo.product.productId !== id), { product: item, remaining: 5000, paused: false }],
        ...(!this.state.items.length ? { focus: { productId: null, sequence: ++this.focusSequence } } : {}) });
    } catch (error) {
      if (request.signal.aborted || this.disposed || this.handleExpired(error)) return;
      const uncertain = this.uncertain(error);
      this.pending(id, uncertain ? "remove-uncertain" : undefined);
      if (!uncertain) {
        const snapshot = this.removed.get(id)!;
        const items = [...this.state.items]; items.splice(Math.min(Math.max(0, snapshot.index), items.length), 0, item);
        this.removed.delete(id);
        this.patch({ items, focus: { productId: id, sequence: ++this.focusSequence } });
      }
      this.notice({ id: `remove:${id}`, kind: "error", title: uncertain ? "No pudimos confirmar la eliminación" : "No pudimos quitar el producto",
        message: uncertain ? `Comprobaremos la eliminación de ${item.name} antes de ofrecer Deshacer.` : `${item.name} continúa en tus favoritos.`, action: "remove", productId: id });
    } finally { this.finish(id, request); }
  }
  pauseUndo = (id: string, paused: boolean) => {
    this.patch({ undos: this.state.undos.map(undo => undo.product.productId === id ? { ...undo, paused } : undo) });
  };
  closeUndo = (id: string) => {
    if (this.requests.has(id)) return;
    this.removed.delete(id);
    this.patch({ undos: this.state.undos.filter(undo => undo.product.productId !== id), focus: { productId: null, sequence: ++this.focusSequence } });
  };
  tick = (elapsed: number) => {
    if (!this.state.undos.length) return;
    const visible = this.state.undos.slice(0, 3).map(undo => undo.product.productId);
    const next = this.state.undos.map(undo => visible.includes(undo.product.productId) && !undo.paused && !undo.failed && !this.state.pending[undo.product.productId]
      ? { ...undo, remaining: Math.max(0, undo.remaining - elapsed) } : undo);
    for (const undo of next) if (undo.remaining === 0) this.removed.delete(undo.product.productId);
    this.patch({ undos: next.filter(undo => undo.remaining > 0) });
  };
  async restore(id: string) {
    const undo = this.state.undos.find(item => item.product.productId === id); if (!undo || undo.cannotRestore) return;
    const request = this.start(id, "restoring", this.state.pending[id] === "restore-uncertain"); if (!request) return;
    this.dismiss(`restore:${id}`);
    try {
      await this.transport.save(id, request.signal);
      if (request.signal.aborted || this.disposed) return;
      this.removed.delete(id); this.pending(id);
      this.hooks.confirmed?.(id, true);
      this.patch({ items: [undo.product, ...this.state.items.filter(item => item.productId !== id)],
        undos: this.state.undos.filter(item => item.product.productId !== id), focus: { productId: id, sequence: ++this.focusSequence } });
      this.notice({ id: `restore:${id}`, kind: "success", title: "Producto restaurado", message: `${undo.product.name} vuelve a estar en tus favoritos.` });
      this.refreshNeeded = true;
    } catch (error) {
      if (request.signal.aborted || this.disposed || this.handleExpired(error)) return;
      const uncertain = this.uncertain(error);
      this.pending(id, uncertain ? "restore-uncertain" : undefined);
      const unavailable = error instanceof WishlistError && error.code === "PRODUCT_NOT_AVAILABLE";
      this.patch({ undos: this.state.undos.map(item => item.product.productId === id ? { ...item, failed: true, cannotRestore: unavailable } : item) });
      this.notice({ id: `restore:${id}`, kind: "error", title: uncertain ? "Restauración sin confirmar" : "No pudimos restaurar el producto",
        message: unavailable ? "El producto ya no está activo. Puedes explorar otros productos." : "No confirmamos la restauración. Puedes volver a comprobarla.",
        action: unavailable ? "catalog" : "restore", productId: id });
    } finally { this.finish(id, request); }
  }
  async move(id: string, retry = false) {
    const product = this.state.items.find(item => item.productId === id);
    if (!product || product.availability !== "in_stock") return;
    const request = this.start(id, "moving", retry); if (!request) return;
    const key = this.moveKeys.get(id) ?? crypto.randomUUID(); this.moveKeys.set(id, key);
    this.notice({ id: `move:${id}`, kind: "info", title: `Moviendo ${product.name}`, message: "Confirmaremos el resultado cuando el carrito se actualice.", productId: id });
    try {
      const result = await this.transport.move(id, key, request.signal);
      if (request.signal.aborted || this.disposed) return;
      const before = this.state.items;
      this.pending(id); this.moveKeys.delete(id); this.hooks.confirmed?.(id, false);
      // Concurrent responses may arrive in reverse order: keep the newest cart version.
      const cart = this.state.cart && this.state.cart.version > result.cart.version ? this.state.cart : result.cart;
      this.patch({ items: before.filter(item => item.productId !== id), cart, focus: this.focusAfter(id, before) });
      this.notice({ id: `move:${id}`, kind: "success", title: "Producto en tu carrito", message: `${product.name} se movió correctamente.`, action: "cart", productId: id });
    } catch (error) {
      if (request.signal.aborted || this.disposed || this.handleExpired(error)) return;
      const uncertain = this.uncertain(error);
      this.pending(id, uncertain ? "move-uncertain" : undefined);
      if (!uncertain) this.moveKeys.delete(id);
      if (error instanceof WishlistError && error.code === "VARIANT_SELECTION_REQUIRED") {
        this.notice({ id: `move:${id}`, kind: "warning", title: "Elige una variante", message: "El producto sigue en tus favoritos. Selecciona una variante en su ficha.", action: error.redirectUrl ? "variant" : undefined, redirectUrl: error.redirectUrl, productId: id });
      } else {
        if (error instanceof WishlistError && ["STOCK_LIMIT_REACHED", "PRODUCT_NOT_AVAILABLE"].includes(error.code)) {
          this.patch({ items: this.state.items.map(item => item.productId === id ? { ...item, availability: error.code === "STOCK_LIMIT_REACHED" ? "out_of_stock" : "unavailable" } : item) });
        }
        this.notice({ id: `move:${id}`, kind: "error", title: uncertain ? "Movimiento sin confirmar" : "No pudimos mover el producto",
          message: uncertain ? "No sabemos si el carrito se actualizó. Comprueba el mismo intento para evitar duplicados." : error instanceof Error ? error.message : "El producto continúa en tus favoritos.",
          action: product.availability === "in_stock" && (!(error instanceof WishlistError) || !["STOCK_LIMIT_REACHED", "PRODUCT_NOT_AVAILABLE", "IDEMPOTENCY_CONFLICT"].includes(error.code)) ? "move" : undefined, productId: id });
      }
    } finally { this.finish(id, request); }
  }
  dispose() {
    this.disposed = true; this.query?.abort();
    for (const request of this.requests.values()) request.abort();
    this.listeners.clear(); this.requests.clear(); this.removed.clear(); this.moveKeys.clear();
  }
}
