"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  showCount?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    { label, hint, error, showCount = false, maxLength, value, id: idProp, className = "", ...rest },
    ref,
  ) {
    const autoId = useId();
    const id = idProp ?? autoId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className={className}>
        <label htmlFor={id} className="block text-xs font-semibold text-slate-200">
          {label}
        </label>
        {hint && (
          <p id={hintId} className="mt-0.5 text-[11px] text-slate-400">
            {hint}
          </p>
        )}
        <textarea
          ref={ref}
          id={id}
          value={value}
          maxLength={maxLength}
          aria-describedby={
            [hintId, errorId].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={error ? true : undefined}
          className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs text-slate-100 bg-slate-900/60 placeholder:text-slate-500 focus:outline-none transition resize-y min-h-[5rem] ${
            error
              ? "border-red-400/50 focus:border-red-400/70"
              : "border-cyan-400/25 focus:border-cyan-400/50"
          }`}
          {...rest}
        />
        <div className="mt-1 flex items-center justify-between">
          {error ? (
            <p id={errorId} className="text-[11px] text-red-300" role="alert">
              {error}
            </p>
          ) : (
            <span />
          )}
          {showCount && maxLength && (
            <span className="text-[10px] text-slate-500">
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);

export { TextArea };
export type { TextAreaProps };
