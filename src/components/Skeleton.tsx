import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse bg-slate-200 rounded', className)}
      {...props}
    />
  );
}

export function ExpenseRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-slate-100">
      <Skeleton className="h-4 w-24" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-6" />
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={cn('flex items-center justify-center', height)}>
      <div className="w-3/4">
        <div className="flex items-end gap-2 h-40">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 60 + 40}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FamilyMemberSkeleton() {
  return (
    <div className="bg-white/60 dark:bg-white/[0.03] rounded-2xl border border-foreground/10 p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div>
          <Skeleton className="h-4 w-28 mb-1.5" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="p-4 flex gap-3 border-b border-foreground/5">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

export function AIChatSkeleton() {
  return (
    <div className="space-y-4 p-2">
      <div className="flex gap-2.5 justify-start">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="space-y-1.5 max-w-[70%]">
          <Skeleton className="h-12 w-48 rounded-2xl rounded-tl-none bg-slate-300/40 dark:bg-white/5" />
        </div>
      </div>
      <div className="flex gap-2.5 justify-end">
        <div className="space-y-1.5 max-w-[70%]">
          <Skeleton className="h-8 w-32 rounded-2xl rounded-tr-none bg-slate-300/40 dark:bg-white/5" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      </div>
      <div className="flex gap-2.5 justify-start">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="space-y-1.5 max-w-[70%]">
          <Skeleton className="h-16 w-56 rounded-2xl rounded-tl-none bg-slate-300/40 dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export function SettingsFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
    </div>
  );
}

