"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { isCatalogFilters, isCatalogPage } from "./api";
import { useCatalog } from "./useCatalog";

export function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const params = useSearchParams();
  const applied = params.get("q") || "";
  return <SearchForm key={applied} applied={applied} onNavigate={onNavigate} />;
}

function SearchForm({ applied, onNavigate }: { applied: string; onNavigate?: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(applied);
  const [error, setError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [settledQuery, setSettledQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const suggestionsList = useRef<HTMLUListElement>(null);
  const suggestionsId = useId();
  const normalized = value.trim().replace(/\s+/gu, " ");
  const length = Array.from(normalized).length;
  const candidate = suggesting && length >= 2 && length <= 120 ? normalized : "";

  useEffect(() => {
    if (!candidate) return;
    const timer = setTimeout(() => setSettledQuery(candidate), 250);
    return () => clearTimeout(timer);
  }, [candidate]);

  const query = candidate && candidate === settledQuery ? candidate : "";
  const { state: products } = useCatalog(query ? `products?${new URLSearchParams({ q: query, pageSize: "3" })}` : null, isCatalogPage);
  const { state: options } = useCatalog(query ? "filters" : null, isCatalogFilters);
  const items = products.status === "ready" ? products.data.data : [];
  const term = query.toLocaleLowerCase("es");
  const suggestions = [
    ...items.slice(0, 2).map(item => ({ key: `product:${item.productId}`, label: item.name, href: `/productos/${item.slug}` })),
    ...(options.status === "ready" ? [
      ...options.data.brands.filter(item => item.name.toLocaleLowerCase("es").includes(term)).slice(0, 1)
        .map(item => ({ key: `brand:${item.brandId}`, label: `Marca ${item.name}`, href: `/catalogo?brandIds=${encodeURIComponent(item.brandId)}` })),
      ...options.data.categories.filter(item => item.name.toLocaleLowerCase("es").includes(term) ||
        items.some(product => product.categoryId === item.categoryId)).slice(0, 1)
        .map(item => ({ key: `category:${item.categoryId}`, label: item.name, href: `/catalogo?categoryIds=${encodeURIComponent(item.categoryId)}` })),
    ] : []),
  ];
  const showSuggestions = Boolean(candidate) && !isPending;

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (!showSuggestions) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      input.current?.focus();
      setSuggesting(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const links = Array.from(suggestionsList.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    if (!links.length) return;
    const index = links.findIndex(link => link === event.target);
    if (index < 0 && event.target !== input.current) return;
    event.preventDefault();
    if (event.key === "ArrowDown") (links[index + 1] ?? input.current)?.focus();
    else (links[index < 0 ? links.length - 1 : index - 1] ?? input.current)?.focus();
  }

  function hideSuggestions() {
    setSuggesting(false);
    onNavigate?.();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(isPending) return;
    if (normalized && (length < 2 || length > 120)) {
      setError("Escribe entre 2 y 120 caracteres.");
      return;
    }
    const next = new URLSearchParams(params.toString());
    if(normalized) next.set("q", normalized);
    else next.delete("q");
    next.delete("page");
    setError("");
    setValue(normalized);
    hideSuggestions();
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
      onKeyDown={onKeyDown}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSuggesting(false); }}
    >
      <TextField
        label="Buscar productos"
        labelHidden
        ref={input}
        name="q"
        type="search"
        autoComplete="off"
        aria-controls={showSuggestions ? suggestionsId : undefined}
        value={value}
        onFocus={() => setSuggesting(true)}
        onChange={(event) => {
          setValue(event.target.value);
          setError("");
          setSuggesting(true);
        }}
        placeholder="Busca productos o marcas"
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
            <img src="/figma/h5-shell/search.svg" alt="" width="22" height="22" />
            <span className="sr-only">Buscar</span>
          </Button>
        }
      />
      {showSuggestions && <div id={suggestionsId} className="h5-shell-suggestion-panel">
        <p className="h5-shell-suggestion-title">Sugerencias</p>
        {suggestions.length > 0 ? (
          <ul className="h5-shell-link-list" ref={suggestionsList} aria-label="Sugerencias de búsqueda">
            {suggestions.map(suggestion => <li key={suggestion.key}>
              <Link href={suggestion.href} onClick={hideSuggestions}>
                {suggestion.label}<img src="/figma/h5-shell/arrow.svg" alt="" width="22" height="22" />
              </Link>
            </li>)}
          </ul>
        ) : <p role="status">{!query || products.status === "loading" || options.status === "loading"
          ? "Buscando sugerencias…"
          : products.status === "error" && options.status === "error"
            ? "Las sugerencias no están disponibles. Puedes buscar igualmente."
            : "No hay sugerencias. Puedes buscar igualmente."}</p>}
      </div>}
    </form>
  );
}
