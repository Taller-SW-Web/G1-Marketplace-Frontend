import { Home } from "@/features/catalog/Home";
import { HomeIntro } from "@/features/catalog/HomeIntro";

export default function Page() {
  return <Home intro={<HomeIntro />} />;
}
