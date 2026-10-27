import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/oswald/700.css";
import "@fontsource/roboto-condensed/800.css";
import "@fontsource/roboto-condensed/900.css";
import "./globals.css";
import { Header } from "@/shared/ui/Header";
import { Footer } from "@/shared/ui/Footer";
import { WishlistProvider } from "@/features/wishlist/WishlistProvider";
import { sandboxEnabled } from "@/features/wishlist/server";
import { SiteChrome } from "@/features/wishlist/FavoritesShell";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { authWebEnabled } from "@/features/auth/server";

// Header/login feature configuration must reflect the deployed runtime rather
// than a build-time snapshot (e.g. a container built before G7 is enabled).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Inka Athletics | Encuentra tu movimiento",
    template: "%s | Inka Athletics",
  },
  description:
    "Explora el catálogo de equipamiento, ropa y accesorios deportivos de Inka Athletics.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PE" data-scroll-behavior="smooth">
      <body>
        <AuthProvider enabled={authWebEnabled()}>
        <WishlistProvider enabled={sandboxEnabled() || authWebEnabled()} realAuth={authWebEnabled()}>
          <SiteChrome header={<Header />} footer={<Footer />}>{children}</SiteChrome>
        </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
