"use client";

import { useState } from "react";
import { CartPageContainer } from "@/features/cart/CartPageContainer";
import { UndoRemovalFeedback } from "@/features/cart/UndoRemovalFeedback";
import { MergeAdjustmentsDialog } from "@/features/cart/MergeAdjustmentsDialog";
import type { CartSnapshot, MergeAdjustment } from "@/features/cart/types";
import { Button } from "@/shared/ui/Button";

const label = "Zapatillas de prueba";
const cart: CartSnapshot = {
  cartId: "fixture-carrito",
  version: 1,
  items: [{ sku: "SKU-PRUEBA-42", name: label, quantity: 1, unitPrice: { amount: 99.9, currency: "PEN" } }],
};
const adjustments: MergeAdjustment[] = [
  { sku: "SKU-PRUEBA-42", requestedQuantity: 5, confirmedQuantity: 2, reason: "STOCK_LIMIT" },
];

export function CartOverlayFixtures() {
  const [hasItem, setHasItem] = useState(true);
  const [showUndo, setShowUndo] = useState(false);
  const [showMerge, setShowMerge] = useState(false);

  return <>
    <section className="container" aria-label="Escenarios con datos sintéticos">
      <p>QA local · Datos sintéticos</p>
      <Button type="button" onClick={() => setShowMerge(true)}>Simular resultado de fusión tras MFA</Button>
    </section>
    <CartPageContainer
      cart={hasItem ? cart : { ...cart, items: [] }}
      status={hasItem ? "ready" : "empty"}
      onRemove={() => { setHasItem(false); setShowUndo(true); }}
    />
    {showUndo && <UndoRemovalFeedback
      label={label}
      onDismiss={() => setShowUndo(false)}
      onUndo={() => { setHasItem(true); setShowUndo(false); }}
    />}
    <MergeAdjustmentsDialog
      adjustments={adjustments}
      opened={showMerge}
      onClose={() => setShowMerge(false)}
      onViewCart={() => setShowMerge(false)}
    />
  </>;
}
