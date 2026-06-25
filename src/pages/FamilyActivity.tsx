import { useAuthStore } from '@/stores/authStore';
import { useFamilies, useFamilyActivityLogs } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent } from '@/components/Card';
import { formatDate, sanitizeName } from '@/lib/utils';
import {
  Users,
  Activity,
  PlusCircle,
  Trash2,
  Settings,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export function FamilyActivityPage() {
  const { user } = useAuthStore();

  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  const { data: logs = [], isLoading: logsLoading } = useFamilyActivityLogs(familyId);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'family_created':
        return <Sparkles className="h-5 w-5 text-indigo-500" />;
      case 'member_joined':
        return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
      case 'expense_deleted':
        return <Trash2 className="h-5 w-5 text-rose-500" />;
      case 'expense_restored':
        return <RotateCcw className="h-5 w-5 text-sky-500" />;
      case 'ownership_transferred':
        return <Settings className="h-5 w-5 text-amber-500" />;
      default:
        return <PlusCircle className="h-5 w-5 text-purple-500" />;
    }
  };

  const formatActivityMessage = (log: any) => {
    const actorName = sanitizeName(log.actor?.full_name) || log.actor?.email || 'Someone';
    const metadata = log.metadata || {};

    switch (log.action) {
      case 'family_created':
        return `${actorName} created the family workspace.`;
      case 'member_joined':
        return `${actorName} joined the family group.`;
      case 'expense_deleted':
        return `${actorName} deleted expense "${metadata.title || 'Untitled'}" of amount ₹${metadata.amount || '0'}.`;
      case 'expense_restored':
        return `${actorName} restored expense "${metadata.title || 'Untitled'}" of amount ₹${metadata.amount || '0'}.`;
      case 'expense_permanently_deleted':
        return `${actorName} permanently deleted expense "${metadata.title || 'Untitled'}" from trash.`;
      case 'ownership_transferred':
        return `${actorName} transferred family ownership.`;
      default:
        return `${actorName} performed action "${log.action}".`;
    }
  };

  if (familiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeFamily) {
    return (
      <Card className="py-12 text-center max-w-lg mx-auto">
        <CardContent>
          <Users className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground">No active family</h2>
          <p className="text-sm text-foreground/60 mt-1 mb-6">
            Join or create a family group first in order to view activity logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <TextReveal
          text="Family Activity"
          subtitle="Real-time log of events in your family group"
          textSize="text-2xl"
        />
      </div>

      <Card className="relative overflow-hidden border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-glass">
        {/* Top Gradient line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-600" />
        <CardContent className="p-6">
          {logsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-4">
                  <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-foreground/50">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>No activity logs recorded yet</p>
            </div>
          ) : (
            <div className="relative border-l border-foreground/10 pl-6 space-y-8 ml-4">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[38px] top-0 h-9 w-9 rounded-xl bg-card border border-foreground/10 flex items-center justify-center shadow-sm">
                    {getActivityIcon(log.action)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {formatActivityMessage(log)}
                    </p>
                    <p className="text-xs text-foreground/45">
                      {formatDate(log.created_at, 'full')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
