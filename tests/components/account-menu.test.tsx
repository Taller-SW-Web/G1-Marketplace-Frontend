import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "../../src/features/auth/AccountMenu";
import { useAuth } from "../../src/features/auth/AuthProvider";

vi.mock("../../src/features/auth/AuthProvider", () => ({ useAuth: vi.fn() }));
vi.mock("../../src/features/auth/client", () => ({ announceSessionChange: vi.fn(), authCall: vi.fn() }));
vi.mock("../../src/features/auth/CheckoutLogoutDialog", () => ({ CheckoutLogoutDialog: () => null }));

describe("authenticated account navigation", () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

  it("links an authenticated customer to their order history", () => {
    vi.mocked(useAuth).mockReturnValue({
      enabled: true,
      busy: false,
      session: { authenticated: true, user: { nombreCompleto: "Fernando Saire" } },
      sync: async () => {},
    } as ReturnType<typeof useAuth>);

    render(<AccountMenu />);

    expect(screen.getByRole("link", { name: "Mis pedidos" }).getAttribute("href")).toBe("/mis-pedidos");
    expect(screen.getByText("Fernando Saire")).toBeTruthy();
  });

  it("does not show private order navigation while unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      enabled: true, busy: false, session: { authenticated: false }, sync: async () => {},
    } as ReturnType<typeof useAuth>);

    render(<AccountMenu />);

    expect(screen.queryByRole("link", { name: "Mis pedidos" })).toBeNull();
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
  });
});
