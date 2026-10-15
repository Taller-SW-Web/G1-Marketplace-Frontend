"use client";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    router.push(`/catalogo${next.size ? `?${next}` : ""}`);
  }
  return (
    <form
      className="search-box"
      role="search"
      aria-label="Búsqueda de productos"
      onSubmit={submit}
    >
      <label className="sr-only" htmlFor="buscar-productos">
        Buscar productos
      </label>
      <div className={`search-control ${error ? "has-error" : ""}`}>
        <span aria-hidden="true" className="search-icon">
          ⌕
        </span>
        <input
          id="buscar-productos"
          name="q"
          type="search"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError("");
          }}
          placeholder="¿Qué te mueve hoy?"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "search-error" : undefined}
        />
        <button type="submit">
          Buscar <span aria-hidden="true">↗</span>
        </button>
      </div>
      {error && (
        <p id="search-error" className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
