import { notFound } from "next/navigation";
import { sandboxEnabled } from "@/features/wishlist/server";
import { FavoritesDemo } from "@/features/wishlist/FavoritesDemo";
import { isScenario } from "@/features/wishlist/demo-transport";
export const dynamic = "force-dynamic";
export default async function FavoritesPreview({ searchParams }: { searchParams: Promise<{ estado?: string | string[] }> }) {
  if (!sandboxEnabled()) notFound();
  const { estado } = await searchParams;
  const scenario = isScenario(estado) ? estado : "lista";
  return <div className="container favorites-page"><FavoritesDemo key={scenario} scenario={scenario} /></div>;
}
