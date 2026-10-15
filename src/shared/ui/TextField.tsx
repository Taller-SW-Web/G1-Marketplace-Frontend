"use client";
import { useId, type ComponentProps, type ReactNode } from "react";

export type TextFieldProps = Omit<ComponentProps<"input">, "children"> & {
  label: string;
  labelHidden?: boolean;
  hint?: ReactNode;
  error?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  wrapperClassName?: string;
  controlClassName?: string;
};

export function TextField({
  label,
  labelHidden = false,
  hint,
  error,
  id,
  type = "text",
  startAdornment,
  endAdornment,
  wrapperClassName = "",
  controlClassName = "",
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  "aria-errormessage": ariaErrorMessage,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id || `field-${generatedId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const description =
    [describedBy, hint ? hintId : undefined, error ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className={`field ${wrapperClassName}`.trim()}>
      <label
        htmlFor={inputId}
        className={labelHidden ? "sr-only" : "field-label"}
      >
        {label}
      </label>
      <div
        className={`field-control${error ? " has-error" : ""} ${controlClassName}`.trim()}
      >
        {startAdornment && (
          <span className="field-adornment" aria-hidden="true">
            {startAdornment}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          type={type}
          aria-describedby={description}
          aria-invalid={error ? true : ariaInvalid}
          aria-errormessage={error ? errorId : ariaErrorMessage}
        />
        {endAdornment && <div className="field-actions">{endAdornment}</div>}
      </div>
      {hint && (
        <div id={hintId} className="field-hint">
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
