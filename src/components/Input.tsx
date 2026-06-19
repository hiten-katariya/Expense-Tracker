import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, type, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative rounded-xl">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-300">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'w-full rounded-xl border bg-white dark:bg-bg-deep/40 px-4 py-3 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-300',
              'placeholder:text-slate-400 dark:placeholder:text-slate-600',
              'focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-slate-50 dark:focus:bg-bg-deep/60',
              error
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-slate-200 dark:border-white/10 focus:border-primary-500/70',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-300">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}
        {hint && !error && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 tracking-wide">
            {label}
          </label>
        )}
        <select
          className={cn(
            'w-full rounded-xl border bg-white dark:bg-bg-deep/40 px-4 py-3 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-300',
            'focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-slate-50 dark:focus:bg-bg-deep/60',
            error
              ? 'border-red-500/50 focus:border-red-500'
              : 'border-slate-200 dark:border-white/10 focus:border-primary-500/70',
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-white dark:bg-bg-card text-slate-500">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-white dark:bg-bg-card text-slate-900 dark:text-white">
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 tracking-wide">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            'w-full rounded-xl border bg-white dark:bg-bg-deep/40 px-4 py-3 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-300 resize-none',
            'placeholder:text-slate-400 dark:placeholder:text-slate-600',
            'focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-slate-50 dark:focus:bg-bg-deep/60',
            error
              ? 'border-red-500/50 focus:border-red-500'
              : 'border-slate-200 dark:border-white/10 focus:border-primary-500/70',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}
        {hint && !error && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({ className, label, ...props }: CheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        className={cn(
          'h-5 w-5 rounded border-slate-200 dark:border-white/10 bg-white dark:bg-bg-deep/40 text-primary-500 focus:ring-primary-500/20 focus:ring-offset-0 focus:ring-4',
          'transition-all duration-300 cursor-pointer',
          className
        )}
        {...props}
      />
      <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition-colors duration-200">{label}</span>
    </label>
  );
}
