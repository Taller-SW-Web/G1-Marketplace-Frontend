"use client";
import type {
  AttributeSelection,
  VariantAttributeDTO,
} from "../types/product-variants.types";

interface Props {
  attributes: VariantAttributeDTO[];
  selection: AttributeSelection;
  valid: boolean;
}

/**
 * `CMP-F013-002` · SelectionSummary — anuncia la combinación sin sustituir
 * el estado de disponibilidad (F-014).
 */
export function SelectionSummary({ attributes, selection, valid }: Props) {
  const chosen = attributes.filter((attribute) => selection[attribute.id]);
  const text =
    chosen.length === 0
      ? "Selecciona tus opciones."
      : `${valid ? "Selección" : "Selección incompleta"}: ${chosen
          .map((attribute) => {
            const selected = attribute.values.find(
              (item) => item.id === selection[attribute.id],
            );
            return `${attribute.label}: ${selected?.label ?? selection[attribute.id]}`;
          })
          .join(" · ")}.`;

  return (
    <p className="selection-summary" aria-live="polite">
      {text}
    </p>
  );
}
