"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { createDemoTransport, demoProducts, isScenario, scenarios, type Scenario } from "./demo-transport";
import { useFavoritesController } from "./useFavoritesController";
import { FavoritesExperience } from "./FavoritesExperience";

export function FavoritesDemo({ scenario }: { scenario: Scenario }) {
  const router = useRouter();
  const [demo] = useState(() => createDemoTransport(scenario));
  const { controller, state } = useFavoritesController(demo.adapter, { autoLoad: false });
  useEffect(() => {
    let active = true;
    void controller.load().then(async () => {
      if (!active) return;
      const id = demoProducts[0].productId;
      if (["quitando", "error-quitar", "eliminado", "restaurando", "restaurado", "error-restaurar"].includes(scenario)) {
        await controller.remove(id);
        if (active && ["restaurando", "restaurado", "error-restaurar"].includes(scenario)) await controller.restore(id);
      }
      if (active && ["moviendo", "movido", "error-mover", "incierto", "variante"].includes(scenario)) await controller.move(scenario === "variante" ? demoProducts[1].productId : id);
    });
    return () => { active = false; };
  }, [controller, scenario]);
  return <>
    <aside className="favorites-demo-controls" aria-label="Escenarios de demostración">
      <p><strong>Demostración local</strong> · Datos y operaciones simulados; no modifica tu cuenta ni el carrito real.</p>
      <label htmlFor="favorites-scenario">Estado de favoritos</label>
      <select id="favorites-scenario" value={scenario} onChange={event => {
        if (isScenario(event.target.value)) router.replace(`/demo/h3/favoritos/lista?estado=${event.target.value}`);
      }}>{Object.entries(scenarios).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      {["quitando", "restaurando", "moviendo", "cargando"].includes(scenario) && <Button variant="secondary" onClick={demo.complete}>Completar operación simulada</Button>}
    </aside>
    <FavoritesExperience state={state} controller={controller} returnPath={`/demo/h3/favoritos/lista?estado=${scenario}`} demo />
  </>;
}
