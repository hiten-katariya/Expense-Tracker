import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  animate?: boolean;
}

export function Card({ className, hoverable = false, animate = true, children, ...props }: CardProps) {
  const cardClasses = cn(
    'glass-card neumorphic-glow overflow-hidden relative group',
    hoverable && 'glass-card-hover',
    className
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cardClasses}
        {...(props as any)}
      >
        {/* Decorative corner light overlay */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/[0.02] dark:bg-white/[0.01]', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-slate-800 dark:text-white tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/[0.03] dark:bg-white/[0.02] rounded-b-2xl', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}) {
  return (
    <Card hoverable className={cn('relative', className)}>
      {/* Glow background behind icon */}
      <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary-500/5 blur-2xl pointer-events-none" />
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
            <p className="mt-3 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
              {value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 text-primary-500 dark:text-primary-400 border border-slate-100 dark:border-white/10 group-hover:border-primary-500/30 group-hover:text-primary-400 dark:group-hover:text-primary-300 transition-colors duration-300">
              {icon}
            </div>
          )}
        </div>
        {trend && trendValue && (
          <div className="mt-5 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold',
                trend === 'up' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10',
                trend === 'down' && 'bg-red-500/10 text-red-400 border border-red-500/10',
                trend === 'neutral' && 'bg-slate-800 text-slate-400 border border-slate-700/50'
              )}
            >
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trendValue}
            </span>
            <span className="text-xs text-slate-500">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
