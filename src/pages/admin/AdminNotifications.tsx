import React from 'react';
import { useAdminNotifications } from '@/hooks/useAdmin';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminNotifications() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useAdminNotifications({ page, limit: 20 });
  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg"><Bell className="h-5 w-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold">Notifications</h1><p className="text-sm text-foreground/50">{data?.total || 0} total — read-only</p></div>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-foreground/10 bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden md:table-cell">Read</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-foreground/5">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-4"><div className="h-5 bg-foreground/5 rounded animate-pulse" /></td></tr>) :
               data?.data?.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-foreground/40">No notifications</td></tr> :
               data?.data?.map((n: any) => (
                <tr key={n.id} className="hover:bg-foreground/[0.02]">
                  <td className="px-4 py-3 truncate max-w-[140px]">{n.profile?.full_name || n.profile?.email || '—'}</td>
                  <td className="px-4 py-3"><span className="badge-dark badge-primary-dark">{n.type}</span></td>
                  <td className="px-4 py-3 truncate max-w-[200px]">{n.title}</td>
                  <td className="px-4 py-3 text-foreground/60 hidden md:table-cell">{n.is_read ? '✓' : '✗'}</td>
                  <td className="px-4 py-3 text-foreground/60 hidden lg:table-cell">{n.created_at ? format(new Date(n.created_at), 'MMM d h:mm a') : '—'}</td>
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
