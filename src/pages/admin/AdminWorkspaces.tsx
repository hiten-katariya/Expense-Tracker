import React from 'react';
import { useAdminWorkspaces } from '@/hooks/useAdmin';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminWorkspaces() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useAdminWorkspaces({ page, limit: 20 });
  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg"><Building2 className="h-5 w-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold">Workspaces</h1><p className="text-sm text-foreground/50">{data?.total || 0} total — read-only</p></div>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-foreground/10 bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Members</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden md:table-cell">Personal</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden lg:table-cell">Created</th>
            </tr></thead>
            <tbody className="divide-y divide-foreground/5">
              {isLoading ? Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={4} className="px-4 py-4"><div className="h-5 bg-foreground/5 rounded animate-pulse" /></td></tr>) :
               data?.data?.length === 0 ? <tr><td colSpan={4} className="px-4 py-12 text-center text-foreground/40">No workspaces</td></tr> :
               data?.data?.map((w: any) => (
                <tr key={w.id} className="hover:bg-foreground/[0.02]">
                  <td className="px-4 py-3 font-medium">{w.name}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-foreground/5 px-2 py-0.5 rounded-full">{w.workspace_members?.length || 0}</span></td>
                  <td className="px-4 py-3 text-foreground/60 hidden md:table-cell">{w.is_personal ? '✓' : '✗'}</td>
                  <td className="px-4 py-3 text-foreground/60 hidden lg:table-cell">{w.created_at ? format(new Date(w.created_at), 'MMM d, yy') : '—'}</td>
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
