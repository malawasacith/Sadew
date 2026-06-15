import React from 'react';
import { cn } from '../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white',
          {
            'bg-[var(--color-primary,theme(colors.slate.900))] text-white hover:opacity-90': variant === 'primary',
            'bg-slate-100 text-slate-900 hover:bg-slate-200': variant === 'secondary',
            'border border-slate-200 hover:bg-slate-100 hover:text-slate-900': variant === 'outline',
            'hover:bg-slate-100 hover:text-slate-900': variant === 'ghost',
            'h-9 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2 text-sm': size === 'md',
            'h-11 px-8 text-base': size === 'lg',
          },
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
