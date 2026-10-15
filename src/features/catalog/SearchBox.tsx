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

function SearchForm({ applied }: { applied: string; }) {
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
    const next = new URLSearchParams(params.toString());
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
        name="q"
        type="search"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError("");
        }}
        placeholder="¿Qué necesitas para tu próxima meta?"
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
            <img src="/figma/search-20.svg" alt="" width="20" height="20" />
            <span className="sr-only">Buscar</span>
          </Button>
        }
      />
    </form>
  );
}
