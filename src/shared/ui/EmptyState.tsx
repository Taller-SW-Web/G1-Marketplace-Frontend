"use client";
import { useId, type ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actions,
  icon,
  headingLevel = 2,
  className = "",
}: EmptyStateProps) {
  const titleId = useId();
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <section
      className={`empty-state ${className}`.trim()}
      aria-labelledby={titleId}
    >
      {icon && (
        <span className="empty-symbol" aria-hidden="true">
          {icon}
        </span>
      )}
      <Heading id={titleId}>{title}</Heading>
      {description && <p>{description}</p>}
      {actions && <div className="actions">{actions}</div>}
    </section>
  );
}
