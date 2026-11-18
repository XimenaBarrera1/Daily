import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-[var(--surface)] border rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] disabled:bg-[var(--surface-secondary)] disabled:text-[var(--muted-foreground)] ${
            error ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20' : 'border-[var(--border)] hover:border-[var(--primary)]/40'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[var(--danger)] font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-[var(--muted-foreground)]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-[var(--surface)] border rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] disabled:bg-[var(--surface-secondary)] ${
            error ? 'border-[var(--danger)] focus:border-[var(--danger)]' : 'border-[var(--border)] hover:border-[var(--primary)]/40'
          } ${className}`}
          rows={3}
          {...props}
        />
        {error && <p className="text-xs text-[var(--danger)] font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-[var(--muted-foreground)]">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
