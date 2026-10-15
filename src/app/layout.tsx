import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/oswald/700.css";
import "./globals.css";
import { Header } from "@/shared/ui/Header";
import { Footer } from "@/shared/ui/Footer";

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
        <Header />
        <main id="contenido">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
