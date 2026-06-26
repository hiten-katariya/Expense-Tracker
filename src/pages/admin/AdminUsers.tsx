import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminUsers } from '@/hooks/useAdmin';
import { Users, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminUsers() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useAdminUsers({ page, limit: 20, search: debouncedSearch, country });
  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-foreground/50">{data?.total || 0} total users — read-only</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <input
            type="text" placeholder="Search by name or email..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="glass-input pl-10"
          />
        </div>
        <input
          type="text" placeholder="Filter by country..."
          value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }}
          className="glass-input w-full sm:w-48"
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.02]">
                <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden md:table-cell">Country</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground/60 text-xs uppercase tracking-wider">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-4"><div className="h-5 bg-foreground/5 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-foreground/40">No users found</td></tr>
              ) : (
                data?.data?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-white text-xs font-bold">
                          {(user.full_name || user.email || '?')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[160px]">{user.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/70 truncate max-w-[200px]">{user.email}</td>
                    <td className="px-4 py-3 text-foreground/60 hidden md:table-cell">{user.country || '—'}</td>
                    <td className="px-4 py-3 text-foreground/60 hidden lg:table-cell">
                      {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/users/${user.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 transition-colors">
                        Details <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-foreground/5">
            <p className="text-xs text-foreground/50">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-foreground/5 disabled:opacity-30 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-foreground/5 disabled:opacity-30 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
