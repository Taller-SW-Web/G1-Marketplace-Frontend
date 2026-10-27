"use client";
import type { ComponentProps, ReactNode } from "react";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingLabel?: string;
  preserveFocusWhileLoading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Cargando…",
  preserveFocusWhileLoading = false,
  disabled = false,
  type = "button",
  startIcon,
  endIcon,
  fullWidth = false,
  className = "",
  children,
  "aria-busy": ariaBusy,
  "aria-disabled": ariaDisabled,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || (loading && !preserveFocusWhileLoading)}
      aria-busy={loading || ariaBusy || undefined}
      aria-disabled={disabled || loading || ariaDisabled || undefined}
      onClick={event => { if (loading) { event.preventDefault(); return; } onClick?.(event); }}
      className={`button button--${variant} button--${size}${fullWidth ? " button--full" : ""} ${className}`.trim()}
    >
      {loading ? (
        <span className="button-spinner" aria-hidden="true" />
      ) : (
        startIcon && (
          <span className="button-icon" aria-hidden="true">
            {startIcon}
          </span>
        )
      )}
      <span>{children}</span>
      {loading && <span className="sr-only">{loadingLabel}</span>}
      {endIcon && !loading && (
        <span className="button-icon" aria-hidden="true">
          {endIcon}
        </span>
      )}
    </button>
  );
}
