import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader as Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-primary-500/30';

    const variants = {
      primary:
        'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20 border border-primary-400/20',
      secondary:
        'bg-foreground/5 dark:bg-white/5 text-foreground/80 dark:text-slate-200 border border-foreground/10 dark:border-white/10 hover:bg-foreground/10 dark:hover:bg-white/10 active:bg-foreground/15 dark:active:bg-white/15 hover:border-foreground/20 dark:hover:border-white/20 shadow-sm',
      danger:
        'bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/25',
      ghost: 'text-foreground/60 dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200 hover:bg-foreground/5 dark:hover:bg-white/5',
    };

    const sizes = {
      sm: 'px-3.5 py-2 text-xs',
      md: 'px-5 py-3 text-sm',
      lg: 'px-7 py-3.5 text-base',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={disabled || isLoading ? {} : { scale: 1.02, y: -1 }}
        whileTap={disabled || isLoading ? {} : { scale: 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...(props as any)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && <span className="flex-shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-primary-500/30';

    const variants = {
      primary:
        'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20 border border-primary-400/20',
      secondary:
        'bg-foreground/5 dark:bg-white/5 text-foreground/80 dark:text-slate-200 border border-foreground/10 dark:border-white/10 hover:bg-foreground/10 dark:hover:bg-white/10 active:bg-foreground/15 dark:active:bg-white/15',
      danger:
        'bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/25',
      ghost: 'text-foreground/60 dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200 hover:bg-foreground/5 dark:hover:bg-white/5',
    };

    const sizes = {
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-3.5',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={disabled || isLoading ? {} : { scale: 1.05, y: -0.5 }}
        whileTap={disabled || isLoading ? {} : { scale: 0.95 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...(props as any)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';
