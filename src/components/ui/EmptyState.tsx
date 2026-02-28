import type { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}

function EmptyState({
  message,
  detail,
  actionLabel,
  onAction,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 text-slate-400" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-200">{message}</p>
      {detail && <p className="text-muted mt-1 text-xs">{detail}</p>}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
