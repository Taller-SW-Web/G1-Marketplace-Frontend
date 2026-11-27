import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CategoryNavigation } from "@/features/catalog/CategoryNavigation";

vi.mock("@/features/catalog/useCatalog", () => ({
  useCatalog: () => ({
    state: {
      status: "ready",
      source: "REAL",
      data: {
        categories: [
          { categoryId: "127dea28-522a-444b-a52a-74538322f8fd", name: "G6_QA_AZURE_20261110232300333_CATEGORIA_EDITADA" },
          { categoryId: "18c2521c-2a13-4571-9b0c-e0575436db26", name: "QA categoria editada 0c16d4ac" },
          { categoryId: "running", name: "Running" },
        ],
        featuredProducts: [],
      },
    },
  }),
}));

it("oculta las dos categorías QA de la barra y conserva los enlaces del catálogo", () => {
  render(<CategoryNavigation />);
  const navigation = within(screen.getByRole("navigation", { name: "Navegación principal" }));

  expect(navigation.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
    "/catalogo",
    "/catalogo?categoryIds=running",
  ]);
});
