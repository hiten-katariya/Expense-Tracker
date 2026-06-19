
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check, Ban } from 'lucide-react';
import type { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from './Button';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  existingExpense: Expense;
  confidenceScore?: number; // 0-1
  onKeepBoth: () => void;
  onCancel: () => void;
}

export function DuplicateWarningModal({
  isOpen,
  existingExpense,
  confidenceScore = 1,
  onKeepBoth,
  onCancel,
}: DuplicateWarningModalProps) {
  const pct = Math.round(confidenceScore * 100);
  const badgeColor =
    pct >= 90 ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
    pct >= 70 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                'bg-blue-500/15 text-blue-600 dark:text-blue-400';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="dup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onCancel}
          />
          {/* Modal */}
          <motion.div
            key="dup-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-card border border-foreground/10 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4 border-b border-foreground/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-base leading-tight">
                      Possible Duplicate Expense Detected
                    </h2>
                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor}`}>
                      {pct}% match confidence
                    </span>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="ml-2 h-8 w-8 flex items-center justify-center rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-foreground/70">
                  An expense with the same amount, date, category and description already exists.
                  Do you still want to save this expense?
                </p>

                {/* Existing expense preview */}
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 space-y-2">
                  <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">Existing expense</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{existingExpense.title}</p>
                      <p className="text-xs text-foreground/50 mt-0.5">
                        {formatDate(existingExpense.expense_date)}
                        {existingExpense.category && (
                          <> · <span style={{ color: existingExpense.category.color || undefined }}>
                            {existingExpense.category.name}
                          </span></>
                        )}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(existingExpense.amount)}
                    </span>
                  </div>
                  {existingExpense.notes && (
                    <p className="text-xs text-foreground/45 italic truncate">{existingExpense.notes}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 px-6 pb-6 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={onCancel}
                  leftIcon={<Ban className="h-4 w-4" />}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={onKeepBoth}
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Keep Both Expenses
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
