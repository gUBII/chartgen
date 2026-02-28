import { forwardRef, useId, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { label, hint, error, options, placeholder, id: idProp, className = "", ...rest },
    ref,
  ) {
    const autoId = useId();
    const id = idProp ?? autoId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

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
        <select
          ref={ref}
          id={id}
          aria-describedby={
            [hintId, errorId].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={error ? true : undefined}
          className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs text-slate-100 bg-slate-900/60 focus:outline-none transition appearance-none ${
            error
              ? "border-red-400/50 focus:border-red-400/70"
              : "border-cyan-400/25 focus:border-cyan-400/50"
          }`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="mt-1 text-[11px] text-red-300" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

export { SelectField };
export type { SelectFieldProps, SelectOption };
