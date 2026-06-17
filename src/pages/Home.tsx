import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/Card';
import { useAuthStore } from '@/stores/authStore';

export function HomePage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur">
              <Sparkles className="h-4 w-4 text-amber-300" />
              Smart finance for individuals, families, and teams
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Track expenses. Scan receipts. Stay within budget.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Expense Tracker gives you a clear home screen first, then lets you choose how to continue.
                Sign in if you already have an account, or create one in a few steps.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={user ? '/dashboard' : '/login'}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                {user ? 'Go to Dashboard' : 'Login'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Sign Up
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {['Fast expense entry', 'AI categorization', 'Family sharing support'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 backdrop-blur">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Card className="border-white/10 bg-white/5 text-white shadow-2xl shadow-black/30 backdrop-blur-xl">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Start here</p>
                <h2 className="mt-2 text-2xl font-semibold">Choose how you want to continue</h2>
              </div>

              <div className="space-y-4">
                <Link
                  to="/login"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 transition hover:bg-white/10"
                >
                  <div>
                    <p className="font-medium">Login</p>
                    <p className="text-sm text-slate-300">Return to your dashboard and expenses</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </Link>

                <Link
                  to="/register"
                  className="flex items-center justify-between rounded-2xl border border-primary-400/20 bg-primary-500/10 px-4 py-4 transition hover:bg-primary-500/20"
                >
                  <div>
                    <p className="font-medium">Sign Up</p>
                    <p className="text-sm text-slate-300">Create a new account and start tracking</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                <ShieldCheck className="mb-2 h-5 w-5 text-emerald-400" />
                Secure sign-in with Supabase Auth, protected storage, and row-level security.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
