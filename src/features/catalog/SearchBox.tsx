"use client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const params = useSearchParams();
  const applied = params.get("q") || "";
  return <SearchForm key={applied} applied={applied} compact={compact} />;
}

function SearchForm({ applied, compact }: { applied: string; compact: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(applied);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(isPending) return;
    const normalized = value.trim().replace(/\s+/gu, " ");
    if(
      normalized &&
      (Array.from(normalized).length < 2 || Array.from(normalized).length > 120)
    ) {
      setError("Escribe entre 2 y 120 caracteres.");
      return;
    }
    const next = compact ? new URLSearchParams() : new URLSearchParams(params.toString());
    if(normalized) next.set("q", normalized);
    else next.delete("q");
    next.delete("page");
    setError("");
    setValue(normalized);
    startTransition(() =>
      router.push(`/catalogo${next.size ? `?${next}` : ""}`),
    );
  }
  return (
    <form
      className="search-box"
      role="search"
      aria-label="Búsqueda de productos"
      onSubmit={submit}
    >
      <TextField
        label="Buscar productos"
        labelHidden={compact}
        name="q"
        type="search"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError("");
        }}
        placeholder={compact ? "Buscar zapatillas, ropa y accesorios" : "¿Qué necesitas para tu próxima meta?"}
        error={error}
        controlClassName="search-control"
        endAdornment={
          <Button
            type="submit"
            size="sm"
            loading={isPending}
            loadingLabel="Abriendo resultados…"
            className="search-submit"
            aria-label="Buscar"
          >
            <img src={compact ? "/figma/favorite-search-17.svg" : "/figma/search-20.svg"} alt="" width={compact ? 17 : 20} height={compact ? 17 : 20} />
            <span className="sr-only">Buscar</span>
          </Button>
        }
      />
    </form>
  );
}
