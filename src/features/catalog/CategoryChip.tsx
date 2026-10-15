"use client";
import { isHome } from "./api";
import { useCatalog } from "./useCatalog";

export function CategoryChip({
  categoryId,
  onRemove,
}: {
  categoryId: string;
  onRemove: () => void;
}) {
  const { state } = useCatalog("home", isHome);
  const label =
    state.status === "ready"
      ? state.data.categories.find(
          (category) => category.categoryId === categoryId,
        )?.name || "seleccionada"
      : "seleccionada";
  return (
    <button onClick={onRemove} aria-label={`Quitar categoría ${label}`}>
      Categoría: {label} <span aria-hidden="true">×</span>
    </button>
  );
}
