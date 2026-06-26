import React from 'react';
import { useAdminEmailLogs } from '@/hooks/useAdmin';
import { Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  sent: 'badge-success-dark', failed: 'badge-danger-dark', queued: 'badge-warning-dark',
  processing: 'badge-primary-dark', skipped: 'badge-dark',
};

export default function AdminEmailLogs() {
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('');
  const { data, isLoading } = useAdminEmailLogs({ page, limit: 20, status: status || undefined });
  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center shadow-lg"><Mail className="h-5 w-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold">Email Logs</h1><p className="text-sm text-foreground/50">{data?.total || 0} emails — read-only</p></div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['', 'sent', 'failed', 'queued', 'processing'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-foreground/10 bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Recipient</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Template</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden md:table-cell">Subject</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-foreground/5">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-4"><div className="h-5 bg-foreground/5 rounded animate-pulse" /></td></tr>) :
               data?.data?.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-foreground/40">No emails</td></tr> :
               data?.data?.map((e: any) => (
                <tr key={e.id} className="hover:bg-foreground/[0.02]">
                  <td className="px-4 py-3 truncate max-w-[180px]">{e.recipient}</td>
                  <td className="px-4 py-3 text-foreground/70">{e.template_name}</td>
                  <td className="px-4 py-3"><span className={`badge-dark ${statusColors[e.status] || ''}`}>{e.status}</span></td>
                  <td className="px-4 py-3 text-foreground/60 hidden md:table-cell truncate max-w-[200px]">{e.subject}</td>
                  <td className="px-4 py-3 text-foreground/60 hidden lg:table-cell">{e.created_at ? format(new Date(e.created_at), 'MMM d h:mm a') : '—'}</td>
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
