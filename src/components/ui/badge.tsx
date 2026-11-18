import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'sage' | 'primary' | 'warning' | 'danger' | 'success' | 'neutral' | 'outline';
  children: React.ReactNode;
}

export function Badge({ variant = 'neutral', className = '', children, ...props }: BadgeProps) {
  const variantStyles = {
    primary: 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/20 font-semibold',
    sage: 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/20',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-border)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-border)]',
    success: 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-border)]',
    neutral: 'bg-[var(--surface-secondary)] text-[var(--muted-foreground)] border-[var(--border)]',
    outline: 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
