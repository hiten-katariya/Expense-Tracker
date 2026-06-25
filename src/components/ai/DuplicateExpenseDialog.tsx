import { Modal } from '../Modal';
import { Button } from '../Button';
import { Calendar, Tag, ShieldAlert } from 'lucide-react';
import type { Expense } from '@/types';

interface DuplicateExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void; // Allow override / save anyway
  duplicateExpense: Expense | null;
}

export function DuplicateExpenseDialog({
  isOpen,
  onClose,
  onConfirm,
  duplicateExpense,
}: DuplicateExpenseDialogProps) {
  if (!duplicateExpense) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Potential Duplicate Detected"
    >
      <div className="space-y-4">
        <div className="flex gap-3 items-start bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-6 w-6 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold">Similar Expense Found</h4>
            <p className="text-xs mt-1 leading-relaxed text-amber-700 dark:text-amber-300">
              An active expense with matching date and amount was found. Please verify if you are entering a duplicate transaction.
            </p>
          </div>
        </div>

        {/* Existing Expense card */}
        <div className="p-4 rounded-2xl border border-foreground/5 bg-foreground/[0.01] space-y-2.5">
          <p className="text-[10px] font-bold text-foreground/45 uppercase tracking-widest">Existing Transaction</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{duplicateExpense.title}</span>
            <span className="text-sm font-black text-foreground">₹{duplicateExpense.amount}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-foreground/60">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {duplicateExpense.expense_date}
            </span>
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> {duplicateExpense.category?.name || 'Uncategorized'}
            </span>
          </div>
          {duplicateExpense.notes && (
            <p className="text-xs text-foreground/50 italic mt-1 bg-foreground/5 p-2 rounded-xl">
              "{duplicateExpense.notes}"
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Cancel & Edit
          </Button>
          <Button onClick={onConfirm} className="text-xs bg-amber-500 hover:bg-amber-600 border-none text-white font-bold">
            Save Anyway
          </Button>
        </div>
      </div>
    </Modal>
  );
}
export default DuplicateExpenseDialog;
