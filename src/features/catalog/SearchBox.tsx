"use client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";

export function SearchBox() {
  const params = useSearchParams();
  const applied = params.get("q") || "";
  return <SearchForm key={applied} applied={applied} />;
}

function SearchForm({ applied }: { applied: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(applied);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const normalized = value.trim().replace(/\s+/gu, " ");
    if (
      normalized &&
      (Array.from(normalized).length < 2 || Array.from(normalized).length > 120)
    ) {
      setError("Escribe entre 2 y 120 caracteres.");
      return;
    }
    const next = new URLSearchParams(params.toString());
    if (normalized) next.set("q", normalized);
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
        labelHidden
        name="q"
        type="search"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError("");
        }}
        placeholder="¿Qué te mueve hoy?"
        error={error}
        controlClassName="search-control"
        startAdornment={<span className="search-icon">⌕</span>}
        endAdornment={
          <Button
            type="submit"
            size="sm"
            loading={isPending}
            loadingLabel="Abriendo resultados…"
            endIcon="↗"
          >
            Buscar
          </Button>
        }
      />
    </form>
  );
}
