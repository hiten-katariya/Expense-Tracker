import { Tag } from 'lucide-react';

interface MerchantSuggestionBadgeProps {
  rawName: string;
  canonicalName: string;
  onClick: (name: string) => void;
  className?: string;
}

export function MerchantSuggestionBadge({
  rawName,
  canonicalName,
  onClick,
  className = '',
}: MerchantSuggestionBadgeProps) {
  if (!canonicalName || canonicalName === rawName) return null;

  return (
    <button
      type="button"
      onClick={() => onClick(canonicalName)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary-500/5 hover:bg-primary-500/10 border border-primary-500/10 text-xs font-semibold text-primary-600 dark:text-primary-400 transition-all active:scale-95 ${className}`}
      title={`Autofill canonical name: "${canonicalName}" instead of "${rawName}"`}
    >
      <Tag className="h-3 w-3" />
      <span>Use "{canonicalName}"</span>
    </button>
  );
}
export default MerchantSuggestionBadge;
