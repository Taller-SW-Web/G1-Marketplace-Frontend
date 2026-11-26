"use client";
import { useId } from "react";
import { isValueEnabled } from "../hooks/useProductVariants";
import type {
  AttributeSelection,
  ProductVariantDTO,
  VariantAttributeDTO,
} from "../types/product-variants.types";

interface Props {
  attributes: VariantAttributeDTO[];
  variants: ProductVariantDTO[];
  value: AttributeSelection;
  busy: boolean;
  onSelectionChange: (attributeId: string, valueId: string) => void;
}

/**
 * `CMP-F013-001` · VariantSelector — botones de opción por atributo.
 *
 * Un valor se deshabilita cuando no queda ninguna variante activa compatible
 * con la selección actual; la explicación acompaña al control y no se
 * conserva un SKU previo.
 */
export function VariantSelector({
  attributes,
  variants,
  value,
  busy,
  onSelectionChange,
}: Props) {
  return (
    <div className="variant-selector">
      {attributes.map((attribute) => (
        <VariantGroup
          key={attribute.id}
          attribute={attribute}
          variants={variants}
          value={value}
          busy={busy}
          onSelectionChange={onSelectionChange}
        />
      ))}
    </div>
  );
}

function VariantGroup({
  attribute,
  variants,
  value,
  busy,
  onSelectionChange,
}: {
  attribute: VariantAttributeDTO;
  variants: ProductVariantDTO[];
  value: AttributeSelection;
  busy: boolean;
  onSelectionChange: (attributeId: string, valueId: string) => void;
}) {
  const labelId = useId();
  const hintId = useId();
  const hasDisabled = attribute.values.some(
    (item) =>
      !isValueEnabled({ variants }, value, attribute.id, item.id),
  );

  return (
    <div className="variant-group" role="group" aria-labelledby={labelId}>
      <p className="variant-label" id={labelId}>
        {attribute.label}
      </p>
      <div className="variant-values">
        {attribute.values.map((item) => {
          const selected = value[attribute.id] === item.id;
          const enabled = isValueEnabled(
            { variants },
            value,
            attribute.id,
            item.id,
          );
          return (
            <button
              key={item.id}
              type="button"
              className="variant-option"
              aria-pressed={selected}
              aria-describedby={!enabled ? hintId : undefined}
              disabled={busy || !enabled}
              onClick={() => onSelectionChange(attribute.id, item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {hasDisabled && (
        <p className="variant-hint" id={hintId}>
          Las opciones deshabilitadas no están disponibles con tu selección.
        </p>
      )}
    </div>
  );
}
