"use client";
import { useId } from "react";
import type { TechnicalSpecificationDTO } from "../types/product-detail.types";

interface Props {
  specs: TechnicalSpecificationDTO[];
  description?: string;
}

/**
 * Texto descriptivo de F-011. El contenido se trata como texto plano:
 * nunca se inyecta HTML sin sanitizar (`dangerouslySetInnerHTML`).
 */
/** Texto seguro: elimina marcados (incluidos bloques script/style) y colapsa espacios. */
export function sanitizeText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function TechnicalSpecifications({ specs, description }: Props) {
  const headingId = useId();
  const text = description ? sanitizeText(description) : "";
  // Regla de validación (funcional §7): nombre y valor no vacíos después de
  // sanitizar; la fila inválida se omite y no se muestra como error.
  const ordered = specs
    .map((spec) => ({
      ...spec,
      name: sanitizeText(spec.name),
      value: sanitizeText(spec.value),
      unit: spec.unit ? sanitizeText(spec.unit) : spec.unit,
    }))
    .filter((spec) => spec.name !== "" && spec.value !== "")
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (!ordered.length && !text) return null;

  const groups: Array<{ group: string; items: typeof ordered }> = [];
  for (const spec of ordered) {
    const group = spec.group?.trim() ?? "";
    const existing = groups.find((entry) => entry.group === group);
    if (existing) existing.items.push(spec);
    else groups.push({ group, items: [spec] });
  }

  return (
    <section className="detail-info" aria-labelledby={headingId}>
      <h2 id={headingId}>Descripción y especificaciones</h2>
      {text && <p className="product-description">{text}</p>}
      {ordered.length > 0 && (
        <div className="spec-groups">
          {groups.map(({ group, items }) => (
            <div className="spec-group" key={group || "sin-group"}>
              {group && <h3>{group}</h3>}
              <dl>
                {items.map((spec) => (
                  <div key={`${spec.name}-${spec.displayOrder}`}>
                    <dt>{spec.name}</dt>
                    <dd>
                      {spec.unit ? `${spec.value} ${spec.unit}` : spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
