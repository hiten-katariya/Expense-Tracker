import { AlertTriangle } from 'lucide-react';

interface AnomalyBadgeProps {
  isAnomaly: boolean;
  score?: number;
  reason?: string | null;
  className?: string;
}

export function AnomalyBadge({ isAnomaly, score = 0, reason, className = '' }: AnomalyBadgeProps) {
  if (!isAnomaly) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400 select-none animate-[pulse_2s_infinite] ${className}`}
      title={reason || 'Outlying expense flagged by AI'}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      <span>AI Outlier</span>
      {score > 0 && (
        <span className="text-[10px] font-black opacity-60 ml-0.5">
          ({score}%)
        </span>
      )}
    </div>
  );
}
export default AnomalyBadge;
