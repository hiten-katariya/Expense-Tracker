import React from 'react';
import { useAdminAuditLogs } from '@/hooks/useAdmin';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAuditLogs() {
  const [page, setPage] = React.useState(1);
  const [eventType, setEventType] = React.useState('');
  const { data, isLoading } = useAdminAuditLogs({ page, limit: 20, eventType: eventType || undefined });
  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-slate-500 to-zinc-500 flex items-center justify-center shadow-lg"><ScrollText className="h-5 w-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-sm text-foreground/50">{data?.total || 0} entries — read-only</p></div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <input type="text" placeholder="Filter by event type..." value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1); }}
          className="glass-input w-full sm:w-64" />
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-foreground/10 bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Event</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Entity</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden md:table-cell">IP</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden md:table-cell">User Agent</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-foreground/5">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-4"><div className="h-5 bg-foreground/5 rounded animate-pulse" /></td></tr>) :
               data?.data?.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-foreground/40">No audit logs</td></tr> :
               data?.data?.map((a: any) => (
                <tr key={a.id} className="hover:bg-foreground/[0.02]">
                  <td className="px-4 py-3"><span className="badge-dark badge-primary-dark">{a.event_type}</span></td>
                  <td className="px-4 py-3 text-foreground/70">{a.entity_type}</td>
                  <td className="px-4 py-3 text-foreground/60 hidden md:table-cell font-mono text-xs">{a.ip_address || '—'}</td>
                  <td className="px-4 py-3 text-foreground/60 hidden md:table-cell truncate max-w-[160px] text-xs">{a.user_agent || '—'}</td>
                  <td className="px-4 py-3 text-foreground/60 hidden lg:table-cell">{a.created_at ? format(new Date(a.created_at), 'MMM d h:mm a') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-foreground/5"><p className="text-xs text-foreground/50">Page {page} of {totalPages}</p><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg hover:bg-foreground/5 disabled:opacity-30"><ChevronLeft className="h-4 w-4"/></button><button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg hover:bg-foreground/5 disabled:opacity-30"><ChevronRight className="h-4 w-4"/></button></div></div>}
      </div>
    </div>
  );
}
