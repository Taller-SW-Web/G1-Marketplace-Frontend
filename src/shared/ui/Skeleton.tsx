import type { CSSProperties, ReactNode } from "react";

export type SkeletonProps = {
  variant?: "block" | "line" | "circle";
  className?: string;
  style?: CSSProperties;
};
export function Skeleton({
  variant = "block",
  className = "",
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}

export function LoadingState({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className={className || undefined} aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
