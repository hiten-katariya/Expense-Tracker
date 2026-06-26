import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminUserDetail } from '@/hooks/useAdmin';
import { format } from 'date-fns';
import {
  ArrowLeft, Phone, MapPin, Calendar, Receipt, Target,
  FolderOpen, Users2, Building2, Bell, Brain, ScanLine, ScrollText,
  Mail as MailIcon
} from 'lucide-react';

function Section({ title, icon: Icon, count, children }: { title: string; icon: any; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-foreground/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-red-400" />
          <span className="font-semibold text-sm">{title}</span>
          {count !== undefined && <span className="text-xs bg-foreground/5 px-2 py-0.5 rounded-full text-foreground/50">{count}</span>}
        </div>
        <span className="text-foreground/30 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-foreground/5 pt-4">{children}</div>}
    </div>
  );
}

function DataTable({ columns, data }: { columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[]; data: any[] }) {
  if (!data || data.length === 0) return <p className="text-sm text-foreground/40 py-3">No data</p>;
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-foreground/10">
            {columns.map(col => <th key={col.key} className="px-3 py-2 text-left font-semibold text-foreground/50 uppercase tracking-wider">{col.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/5">
          {data.slice(0, 50).map((row, i) => (
            <tr key={i} className="hover:bg-foreground/[0.01]">
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2 text-foreground/70 max-w-[200px] truncate">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdminUserDetail(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-foreground/5 rounded-lg animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-foreground/5 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (!data?.profile) {
    return <div className="text-center py-20 text-foreground/40">User not found</div>;
  }

  const p = data.profile;
  const fmtDate = (d: string | null) => d ? format(new Date(d), 'MMM d, yyyy h:mm a') : '—';

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {(p.full_name || p.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{p.full_name || 'No Name'}</h1>
            <p className="text-sm text-foreground/50">{p.email}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-foreground/60">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone_number || '—'}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {[p.city, p.state, p.country].filter(Boolean).join(', ') || '—'}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {fmtDate(p.created_at)}</span>
            </div>
            <div className="flex gap-2 mt-3">
              {p.is_admin && <span className="badge-dark badge-danger-dark">Admin</span>}
              {p.email_verified && <span className="badge-dark badge-success-dark">Email Verified</span>}
              {p.profile_completed && <span className="badge-dark badge-primary-dark">Profile Complete</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <Section title="Expenses" icon={Receipt} count={data.expenses?.length}>
        <DataTable columns={[
          { key: 'title', label: 'Title' },
          { key: 'amount', label: 'Amount', render: (v: number) => `₹${v?.toFixed(2)}` },
          { key: 'category', label: 'Category', render: (_: any, row: any) => row.category?.name || '—' },
          { key: 'expense_date', label: 'Date', render: (v: string) => v ? format(new Date(v), 'MMM d, yy') : '—' },
          { key: 'payment_method', label: 'Method' },
        ]} data={data.expenses} />
      </Section>

      <Section title="Budgets" icon={Target} count={data.budgets?.length}>
        <DataTable columns={[
          { key: 'name', label: 'Name', render: (_: any, row: any) => row.name || row.category?.name || '—' },
          { key: 'amount', label: 'Amount', render: (v: number) => `₹${v?.toFixed(2)}` },
          { key: 'budget_type', label: 'Type' },
          { key: 'starts_on', label: 'Starts', render: (v: string) => v ? format(new Date(v), 'MMM d, yy') : '—' },
        ]} data={data.budgets} />
      </Section>

      <Section title="Categories" icon={FolderOpen} count={data.categories?.length}>
        <DataTable columns={[
          { key: 'icon', label: '🔤', render: (v: string) => v || '—' },
          { key: 'name', label: 'Name' },
          { key: 'monthly_limit', label: 'Limit', render: (v: number | null) => v ? `₹${v}` : '—' },
        ]} data={data.categories} />
      </Section>

      <Section title="Families" icon={Users2} count={data.families?.length}>
        <DataTable columns={[
          { key: 'member_role', label: 'Role' },
          { key: 'family', label: 'Family', render: (_: any, row: any) => row.family?.name || '—' },
          { key: 'joined_at', label: 'Joined', render: (v: string) => v ? format(new Date(v), 'MMM d, yy') : '—' },
        ]} data={data.families} />
      </Section>

      <Section title="Workspaces" icon={Building2} count={data.workspaces?.length}>
        <DataTable columns={[
          { key: 'member_role', label: 'Role' },
          { key: 'workspace', label: 'Workspace', render: (_: any, row: any) => row.workspace?.name || '—' },
        ]} data={data.workspaces} />
      </Section>

      <Section title="Notifications" icon={Bell} count={data.notifications?.length}>
        <DataTable columns={[
          { key: 'type', label: 'Type' },
          { key: 'title', label: 'Title' },
          { key: 'is_read', label: 'Read', render: (v: boolean) => v ? '✓' : '✗' },
          { key: 'created_at', label: 'Date', render: (v: string) => v ? format(new Date(v), 'MMM d, yy h:mm a') : '—' },
        ]} data={data.notifications} />
      </Section>

      <Section title="AI Chat History" icon={Brain} count={data.aiHistory?.length}>
        <DataTable columns={[
          { key: 'role', label: 'Role' },
          { key: 'message', label: 'Message', render: (v: string) => v?.substring(0, 120) + (v?.length > 120 ? '...' : '') },
          { key: 'created_at', label: 'Date', render: (v: string) => v ? format(new Date(v), 'MMM d, yy h:mm a') : '—' },
        ]} data={data.aiHistory} />
      </Section>

      <Section title="Receipt OCR Cache" icon={ScanLine} count={data.ocrCache?.length}>
        <DataTable columns={[
          { key: 'receipt_hash', label: 'Hash', render: (v: string) => v?.substring(0, 12) + '...' },
          { key: 'ocr_language', label: 'Language' },
          { key: 'processing_time', label: 'Time (ms)', render: (v: number) => v?.toFixed(0) || '—' },
          { key: 'created_at', label: 'Date', render: (v: string) => v ? format(new Date(v), 'MMM d, yy') : '—' },
        ]} data={data.ocrCache} />
      </Section>

      <Section title="Audit Logs" icon={ScrollText} count={data.auditLogs?.length}>
        <DataTable columns={[
          { key: 'event_type', label: 'Event' },
          { key: 'entity_type', label: 'Entity' },
          { key: 'ip_address', label: 'IP' },
          { key: 'created_at', label: 'Date', render: (v: string) => v ? format(new Date(v), 'MMM d, yy h:mm a') : '—' },
        ]} data={data.auditLogs} />
      </Section>

      <Section title="Email History" icon={MailIcon} count={data.emailLogs?.length}>
        <DataTable columns={[
          { key: 'template_name', label: 'Template' },
          { key: 'subject', label: 'Subject' },
          { key: 'status', label: 'Status' },
          { key: 'created_at', label: 'Date', render: (v: string) => v ? format(new Date(v), 'MMM d, yy h:mm a') : '—' },
        ]} data={data.emailLogs} />
      </Section>
    </div>
  );
}
