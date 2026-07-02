'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

const inputCls =
  'w-full rounded-md border border-border bg-background px-4 py-3 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError('Λάθος email ή κωδικός.'); return; }
    router.push(params.get('next') || '/admin');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-surface p-8 shadow-card">
      <h1 className="font-display text-2xl font-semibold text-primary">Σύνδεση</h1>
      <label className="mt-6 block">
        <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} autoComplete="username" />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Κωδικός</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} autoComplete="current-password" />
      </label>
      {error && <p className="mt-3 text-[13px] text-cta">{error}</p>}
      <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
        {loading ? 'Σύνδεση…' : 'Σύνδεση'}
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl font-semibold text-primary">Sergiani</div>
          <p className="mt-1 font-sans text-[12px] uppercase tracking-[0.2em] text-muted">Διαχείριση</p>
        </div>
        <Suspense fallback={<div className="rounded-lg border border-border bg-surface p-8 shadow-card text-muted">Φόρτωση…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
